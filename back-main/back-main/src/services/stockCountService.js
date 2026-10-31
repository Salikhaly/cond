const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const {Op}=require('sequelize'),round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
const fail=m=>{throw ApiError.badRequest(m);};
const quantity=v=>{const n=Number(v);if(!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||n<0||n>1e8||Math.abs(n-round(n))>1e-8)fail('Проверьте фактическое количество или стоимость');return n;};
const stamp=v=>v?new Date(v).toISOString():'';
async function book(line,t,lock=false){
 if(!['material','product'].includes(line.kind))fail('Выберите вид запаса');
 const options={transaction:t,...(lock?{lock:t.LOCK.UPDATE}:{})};
 if(line.kind==='material'){
  const m=await M.Material.findByPk(line.itemId,options);if(!m||!m.active)fail('Материал недоступен');
  return {row:m,name:m.name,unit:m.unit,bookQty:Number(m.quantity),unitCost:Number(m.unitCost),retailPrice:null,token:stamp(m.updatedAt)};
 }
 const p=await Product.findByPk(line.itemId,options);if(!p||!p.is_active)fail('Товар недоступен');
 const s=await M.Stock.findByPk(p.id,options);if(!s)fail('Нет складской карточки');const value=await M.StockValue.findByPk(p.id,{transaction:t}),price=await M.SellingPrice.findByPk(p.id,{transaction:t});
 return {row:s,product:p,name:p.name,unit:'кг',bookQty:Number(s.kg),unitCost:value&&Number(value.kg)>0&&Number(value.kg)-Number(value.knownKg)<.00011?Number(value.value)/Number(value.kg):null,retailPrice:price?.price==null?null:Number(price.price),token:stamp(s.updatedAt)+'|'+stamp(value?.updatedAt)};
}
function inputs(b){
 if(!Array.isArray(b.lines)||!b.lines.length||b.lines.length>2000)fail('Выберите товары для ревизии');
 if(new Set(b.lines.map(l=>l.kind+':'+l.itemId)).size!==b.lines.length)fail('Позиция повторяется');return b.lines;
}
async function create(u,b){
 admin(u);if(typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||Number.isNaN(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date)fail('Укажите дату ревизии');
 return db.transaction(async t=>{
  if(b.correctsId){const original=await M.StockCount.findByPk(b.correctsId,{transaction:t,lock:t.LOCK.UPDATE});if(!original||original.status!=='posted')fail('Исправляется только проведённая ревизия');if(await M.StockCount.findOne({where:{correctsId:original.id,status:{[Op.ne]:'cancelled'}},transaction:t}))fail('По этой ревизии уже создана корректировка');if(!String(b.note||'').trim())fail('Укажите причину корректировки');}
  const lines=[];for(const line of inputs(b)){const current=await book(line,t);lines.push({kind:line.kind,itemId:line.kind==='product'?Number(line.itemId):line.itemId,name:current.name,unit:current.unit,bookQty:current.bookQty,unitCost:current.unitCost,retailPrice:current.retailPrice,token:current.token,actualQty:line.actualQty==null||line.actualQty===''?null:quantity(line.actualQty),surplusCost:line.surplusCost==null||line.surplusCost===''?null:quantity(line.surplusCost)});}
  return M.StockCount.create({date:b.date,location:'Склад цеха',note:String(b.note||'').slice(0,2000),correctsId:b.correctsId||null,lines,actorId:u.id,actorName:u.name},{transaction:t});
 });
}
async function draft(u,id,b,outer){
 admin(u);return db.transaction(outer?{transaction:outer}:{},async t=>{
  const doc=await M.StockCount.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!doc||doc.status!=='draft')fail('Можно изменить только черновик');
  if(b.expectedUpdatedAt!==stamp(doc.updatedAt))throw new ApiError(409,'Черновик изменился. Откройте его заново');
  if(b.cancel===true)return doc.update({status:'cancelled'},{transaction:t});
  const input=inputs(b);if(input.length!==doc.lines.length||input.some(l=>!doc.lines.some(x=>x.kind===l.kind&&String(x.itemId)===String(l.itemId))))fail('Состав ревизии изменяется созданием нового черновика');
  const lines=[];for(const old of doc.lines){const line=input.find(l=>l.kind===old.kind&&String(l.itemId)===String(old.itemId)),current=b.refresh===true?await book(old,t):null;lines.push({...old,...(current?{bookQty:current.bookQty,unitCost:current.unitCost,retailPrice:current.retailPrice,token:current.token}:{}),actualQty:line.actualQty==null||line.actualQty===''?null:quantity(line.actualQty),surplusCost:line.surplusCost==null||line.surplusCost===''?null:quantity(line.surplusCost)});}
  return doc.update({lines,note:String(b.note??doc.note).slice(0,2000)},{transaction:t});
 });
}
async function post(u,id,b,outer){
 admin(u);if(b.confirmed!==true)fail('Подтвердите результат пересчёта');
 return db.transaction(outer?{transaction:outer}:{},async t=>{
  const doc=await M.StockCount.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!doc||doc.status!=='draft')fail('Ревизия уже проведена или отменена');
  if(b.expectedUpdatedAt!==stamp(doc.updatedAt))throw new ApiError(409,'Черновик изменился. Проверьте ревизию заново');
  const lines=[];
  // Product → stock → material, deterministic order; matches production/shipment locks.
  const ordered=[...doc.lines].sort((a,b)=>a.kind===b.kind?(a.kind==='product'?a.itemId-b.itemId:String(a.itemId).localeCompare(String(b.itemId))):a.kind==='product'?-1:1);
  for(const l of ordered){
   if(l.actualQty==null)fail('Не заполнен факт: '+l.name);const current=await book(l,t,true);
   if(current.token!==l.token&&Math.abs(current.bookQty-Number(l.bookQty))>.00001)throw new ApiError(409,'Количество на складе изменилось: '+l.name+'. Обновите остатки по программе и проверьте введённый факт');
   const actual=quantity(l.actualQty),delta=round(actual-current.bookQty);let assessment;
   if(l.kind==='product'){
    if(actual<Number(current.row.reservedKg)-.00001)fail('Факт меньше резерва по заявкам: '+l.name+'. Сначала пересогласуйте заявки');
    assessment=await require('./stockValueService').stocktake(current.row,delta,l.surplusCost,doc.id,doc.date,t);
    await current.row.update({kg:actual},{transaction:t});await current.product.update({weightTotal:actual,quantity:Math.floor((actual+1e-8)/Number(current.product.weight))},{transaction:t});
   }else{
    const cost=delta>0&&l.surplusCost!=null?Number(l.surplusCost):Number(current.unitCost);
    assessment={costDelta:round(delta*cost),costComplete:true};
    const unitCost=delta>0&&actual>0?round((current.bookQty*Number(current.unitCost)+delta*cost)/actual):Number(current.unitCost);
    await current.row.update({quantity:actual,unitCost},{transaction:t});
   }
   lines.push({...l,bookQty:current.bookQty,unitCost:current.unitCost,token:current.token,delta,...assessment,retailDelta:l.retailPrice==null?null:round(delta*Number(l.retailPrice))});
  }
  return doc.update({status:'posted',lines,postedBy:u.id,postedByName:u.name,postedAt:new Date()},{transaction:t});
 });
}
async function accept(u,id,b){
 admin(u);if(b.confirmed!==true)fail('Подтвердите фактические остатки');
 return db.transaction(async t=>{
  const saved=await draft(u,id,{lines:b.lines,note:b.note,expectedUpdatedAt:b.expectedUpdatedAt},t);
  if(b.skipUncounted===true){const selected=saved.lines.filter(l=>l.actualQty!=null),skipped=saved.lines.filter(l=>l.actualQty==null);if(!selected.length)fail('Введите фактическое количество хотя бы для одной позиции');if(skipped.length){await M.LegacyLink.create({id:'stock-count-skipped:'+saved.id,data:{reason:'Не пересчитаны: остатки не меняются',lines:skipped,actorId:u.id,actorName:u.name}},{transaction:t});await saved.update({lines:selected},{transaction:t});}}
  return post(u,id,{confirmed:true,expectedUpdatedAt:stamp(saved.updatedAt)},t);
 });
}
module.exports={create,draft,post,accept};
