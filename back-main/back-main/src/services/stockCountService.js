const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const {Op}=require('sequelize'),round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
const fail=m=>{throw ApiError.badRequest(m);};
const quantity=v=>{const n=Number(v);if(!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||n<0||n>1e8||Math.abs(n-round(n))>1e-8)fail('Проверьте фактическое количество или стоимость');return n;};
const stamp=v=>v?new Date(v).toISOString():'';
async function book(line,t,lock=false){
 if(!['material','product','pack'].includes(line.kind))fail('Выберите вид запаса');
 const options={transaction:t,...(lock?{lock:t.LOCK.UPDATE}:{})};
 if(line.kind==='material'){
  const m=await M.Material.findByPk(line.itemId,options);if(!m||!m.active)fail('Материал недоступен');
  const known=await require('./materialPriceService').known([m],t);
  return {row:m,name:m.name,unit:m.unit,bookQty:Number(m.quantity),unitCost:known.has(String(m.id))?Number(m.unitCost):null,retailPrice:null,token:stamp(m.updatedAt)};
 }
 const pack=line.kind==='pack'?await M.ProductPack.findByPk(line.itemId,{transaction:t}):null;
 if(line.kind==='pack'&&(!pack||!pack.active))fail('Фасовка недоступна');
 const p=await Product.findByPk(pack?pack.productId:line.itemId,options);if(!p||!p.is_active)fail('Товар недоступен');
 const s=await M.Stock.findByPk(p.id,options);if(!s)fail('Нет складской карточки');const value=await M.StockValue.findByPk(p.id,{transaction:t}),price=await M.SellingPrice.findByPk(p.id,{transaction:t});
 if(pack){
  if(lock)await pack.reload(options);
  if(!pack.active)fail('Фасовка недоступна');
  const ps=await M.PackStock.findByPk(pack.id,options);if(!ps)fail('Нет остатка фасовки');
  const cost=value&&Number(value.kg)>0&&Number(value.kg)-Number(value.knownKg)<.00011?Number(value.value)/Number(value.kg)*Number(pack.capacityKg):null;
  return {row:s,product:p,pack,packStock:ps,productId:p.id,capacityKg:Number(pack.capacityKg),name:p.name+' · '+Number(pack.capacityKg)+' кг',unit:'коробок',bookQty:Number(ps.boxes),unitCost:cost,retailPrice:pack.salePrice==null?price?.price==null?null:Number(price.price)*Number(pack.capacityKg):Number(pack.salePrice),token:stamp(ps.updatedAt)+'|'+stamp(pack.updatedAt)};
 }
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
  const lines=[];for(const line of inputs(b)){const current=await book(line,t);lines.push({kind:line.kind,itemId:line.kind==='product'?Number(line.itemId):line.itemId,...(line.kind==='pack'?{productId:current.productId,capacityKg:current.capacityKg}:{}),name:current.name,unit:current.unit,bookQty:current.bookQty,unitCost:current.unitCost,retailPrice:current.retailPrice,token:current.token,actualQty:line.actualQty==null||line.actualQty===''?null:quantity(line.actualQty),surplusCost:line.surplusCost==null||line.surplusCost===''?null:quantity(line.surplusCost)});}
  if(lines.some(l=>l.kind==='product'&&lines.some(p=>p.kind==='pack'&&p.productId===l.itemId)))fail('Выберите фасовки товара без повторного пересчёта общего веса');
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
  const ordered=[...doc.lines].sort((a,b)=>{const productId=l=>l.kind==='material'?Infinity:Number(l.productId||l.itemId);return productId(a)-productId(b)||String(a.itemId).localeCompare(String(b.itemId));});
  for(const l of ordered){
   if(l.actualQty==null)fail('Не заполнен факт: '+l.name);const current=await book(l,t,true);
   if(current.token!==l.token&&Math.abs(current.bookQty-Number(l.bookQty))>.00001)throw new ApiError(409,'Количество на складе изменилось: '+l.name+'. Обновите остатки по программе и проверьте введённый факт');
   const actual=quantity(l.actualQty),delta=round(actual-current.bookQty);let assessment;
   if(l.kind==='pack'){
    if(!Number.isInteger(actual))fail('Укажите целое число коробок: '+l.name);
    if(Number(l.capacityKg)!==current.capacityKg)throw new ApiError(409,'Вместимость коробки изменилась: '+l.name+'. Начните новый пересчёт');
    if(actual<Number(current.packStock.reservedBoxes))fail('Факт меньше резерва этой фасовки: '+l.name+'. Сначала пересогласуйте заявки');
    const deltaKg=round(delta*current.capacityKg),nextKg=round(Number(current.row.kg)+deltaKg);
    if(nextKg<Number(current.row.reservedKg)-.00001)fail('Факт меньше общего резерва: '+l.name+'. Сначала пересогласуйте заявки');
    if(nextKg<0)fail('Вес коробок превышает общий склад: '+l.name+'. Нужна сверка исходного веса');
    assessment=await require('./stockValueService').stocktake(current.row,deltaKg,l.surplusCost==null?null:Number(l.surplusCost)/current.capacityKg,doc.id+':pack:'+l.itemId,doc.date,t);
    await current.packStock.update({boxes:actual},{transaction:t});await current.row.update({kg:nextKg},{transaction:t});await current.product.update({weightTotal:nextKg,quantity:Math.floor((nextKg+1e-8)/Number(current.product.weight))},{transaction:t});
    assessment.deltaKg=deltaKg;
   }else if(l.kind==='product'){
    if(delta&&await M.PackStock.count({where:{packId:{[Op.in]:(await M.ProductPack.findAll({where:{productId:current.product.id},attributes:['id'],transaction:t})).map(p=>p.id)},boxes:{[Op.gt]:0}},transaction:t}))fail('Товар учитывается коробками: '+l.name+'. Начните пересчёт по фасовкам');
    if(actual<Number(current.row.reservedKg)-.00001)fail('Факт меньше резерва по заявкам: '+l.name+'. Сначала пересогласуйте заявки');
    assessment=await require('./stockValueService').stocktake(current.row,delta,l.surplusCost,doc.id,doc.date,t);
    await current.row.update({kg:actual},{transaction:t});await current.product.update({weightTotal:actual,quantity:Math.floor((actual+1e-8)/Number(current.product.weight))},{transaction:t});
   }else{
    const numericCost=Number(current.row.unitCost),cost=delta>0?(l.surplusCost!=null?Number(l.surplusCost):current.unitCost==null?0:numericCost):numericCost;
    assessment={costDelta:round(delta*cost),costComplete:delta===0||delta>0&&l.surplusCost!=null||current.unitCost!=null};
    const unitCost=delta>0&&current.bookQty<=0?cost:delta>0&&actual>0?round((current.bookQty*numericCost+delta*cost)/actual):numericCost;
    const costComplete=delta>0?(current.bookQty<=.00001||current.unitCost!=null)&&(l.surplusCost!=null||current.unitCost!=null):current.unitCost!=null;
    await current.row.update({quantity:actual,unitCost,costComplete},{transaction:t});
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
