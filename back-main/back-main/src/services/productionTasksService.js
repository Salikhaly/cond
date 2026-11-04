const db=require('../database/sequelize'),M=require('../models/operations');
// A production-only projection: never expose customers, prices or money to workers.
async function visible(user){
 if(user.role!=='employee'||!(await M.Access.findByPk(user.id))?.productionOrders)return {canViewProductionOrders:false,productionTasks:[]};
 return db.transaction({isolationLevel:'REPEATABLE READ'},async transaction=>{
  const orders=await M.Order.findAll({where:{status:['submitted','approved']},transaction}),stocks=await M.PackStock.findAll({transaction}),kgStocks=await M.Stock.findAll({transaction}),groups=new Map();
  for(const order of orders)for(const line of order.lines){
   const key=line.productId+':'+(line.packId||'kg');
   const item=groups.get(key)||{key,productId:line.productId,packId:line.packId||null,boxes:0,kg:0,pendingOrders:0,deliveryDate:order.deliveryDate};
   if(order.status==='submitted')item.pendingOrders++;
   item.boxes+=Number(line.boxes||0);item.kg+=Number(line.kg||0);
   if(order.deliveryDate<item.deliveryDate)item.deliveryDate=order.deliveryDate;
   groups.set(key,item);
  }
  const round=n=>Math.round(n*10000)/10000;
  return {canViewProductionOrders:true,productionTasks:[...groups.values()].map(row=>{
   const stock=row.packId?stocks.find(s=>s.packId===row.packId):kgStocks.find(s=>s.productId===row.productId);
   const inStock=Number(row.packId?stock?.boxes||0:stock?.kg||0),required=row.packId?row.boxes:row.kg;
   return {...row,boxes:round(row.boxes),kg:round(row.kg),inStock:round(inStock),toMake:round(Math.max(0,required-inStock)),unit:row.packId?'коробок':'кг'};
  }).sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate))||a.key.localeCompare(b.key))};
 });
}
module.exports={visible};
