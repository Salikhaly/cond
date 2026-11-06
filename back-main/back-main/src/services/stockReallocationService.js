const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const {stockReallocation}=require('../domain/stockReallocation');
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
async function snapshot(productId,t,lock=false){
 const options={transaction:t,...(lock?{lock:t.LOCK.UPDATE}:{})};
 const product=await Product.findByPk(productId,options);if(!product||!product.is_active)throw ApiError.badRequest('Выберите действующий товар');
 const stock=await M.Stock.findByPk(product.id,options);if(!stock)throw ApiError.badRequest('Нет складской карточки');
 const definitions=await M.ProductPack.findAll({where:{productId:product.id},order:[['id','ASC']],transaction:t});
 const rows=definitions.length?await M.PackStock.findAll({where:{packId:definitions.map(p=>p.id)},order:[['packId','ASC']],...options}):[];
 const value=await M.StockValue.findByPk(product.id,options);
 const packs=definitions.map(p=>({id:p.id,capacityKg:Number(p.capacityKg),boxes:Number(rows.find(s=>s.packId===p.id)?.boxes||0),reservedBoxes:Number(rows.find(s=>s.packId===p.id)?.reservedBoxes||0)}));
 const token=require('crypto').createHash('sha256').update(JSON.stringify({stock:stock.toJSON(),packs,value:value?.toJSON()})).digest('hex');
 return {product,stock,rows,view:{productId:product.id,name:product.name,kg:Number(stock.kg),reservedKg:Number(stock.reservedKg),packs,token}};
}
async function read(u,id){admin(u);return db.transaction({isolationLevel:'REPEATABLE READ'},async t=>(await snapshot(id,t)).view);}
async function post(u,id,b){
 admin(u);if(b.confirmed!==true||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>2000)throw ApiError.badRequest('Укажите причину и подтвердите фактические остатки');
 const date=require('./businessDay').date(b.date);
 if(b.unitCost!=null&&(!['number','string'].includes(typeof b.unitCost)||!String(b.unitCost).trim()||!Number.isFinite(Number(b.unitCost))||Number(b.unitCost)<0||Number(b.unitCost)>1e8))throw ApiError.badRequest('Проверьте стоимость излишка за кг');
 return db.transaction(async t=>{
  const {product,stock,rows,view}=await snapshot(id,t,true);
  if(b.expectedToken!==view.token)throw new ApiError(409,'Остатки изменились. Обновите сверку и проверьте факт');
  let plan;try{plan=stockReallocation(view,view.packs,b);}catch(e){throw ApiError.badRequest(e.message);}
  const doc=await M.StockCount.create({date,location:'Сверка веса и коробок',note:b.reason.trim(),actorId:u.id,actorName:u.name,lines:[]},{transaction:t});
  const assessment=await require('./stockValueService').stocktake(stock,plan.deltaKg,b.unitCost==null?null:Number(b.unitCost),doc.id,date,t);
  for(const p of plan.packs){const row=rows.find(r=>r.packId===p.packId);if(row)await row.update({boxes:p.boxes},{transaction:t});else if(p.boxes)await M.PackStock.create({packId:p.packId,boxes:p.boxes,reservedBoxes:0},{transaction:t});}
  await stock.update({kg:plan.kg},{transaction:t});await product.update({weightTotal:plan.kg,quantity:Math.floor((plan.kg+1e-8)/Number(product.weight))},{transaction:t});
  await M.LegacyLink.create({id:'stock-reallocation:'+doc.id,data:{productId:product.id,before:view,after:plan,reason:b.reason.trim(),actorId:u.id,actorName:u.name}},{transaction:t});
  return doc.update({status:'posted',postedBy:u.id,postedByName:u.name,postedAt:new Date(),lines:[{kind:'product',itemId:product.id,name:product.name,unit:'кг',bookQty:plan.beforeKg,actualQty:plan.kg,delta:plan.deltaKg,...assessment,retailDelta:null,reallocation:plan.packs,looseKg:plan.looseKg}]},{transaction:t});
 });
}
module.exports={read,post};
