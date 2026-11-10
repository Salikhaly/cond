const bcrypt=require('bcrypt'),{createHash}=require('crypto');
const db=require('./sequelize'),{User,Product,Income}=require('../models/models'),M=require('../models/operations'),{State}=require('../models/sync');
const service=require('../services/operationsService'),trade=require('../services/tradeService'),idempotent=require('../services/idempotency');
const key=tag=>{const h=createHash('sha256').update('public-demo:v1:'+tag).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32)};
module.exports=async()=>{
 if(process.env.PUBLIC_DEMO!=='true')throw Error('Public demo seed is isolated');
 const people=[];
 for(const [email,name,role]of [['admin@demo.test','Нурлан · владелец','super_admin'],['worker@demo.test','Айгуль · кондитер','employee'],['firm@demo.test','Арман · торговый представитель','representative']]){
  const [u]=await User.findOrCreate({where:{email},defaults:{name,role,password:await bcrypt.hash('CondDemo2026!',10),email_confirmed:new Date()}});people.push(u.get({plain:true}));
 }
 const [admin,worker,rep]=people;
 await idempotent({user:admin,headers:{'x-operation-id':key('bootstrap')},method:'POST',path:'/seed-public-demo',body:{version:1}},async()=>{
  await M.Profile.findOrCreate({where:{userId:rep.id},defaults:{company:'Демо · торговый маршрут'}});
  const date='2026-10-27',month='2026-10';
  const materials=[];
  for(const [name,unit,quantity,unitCost]of [['Мука пшеничная','кг',500,280],['Сахар','кг',200,420],['Масло сливочное','кг',90,3200],['Коробка для печенья','шт',500,120]]){
   const m=await service.material(admin,{name,unit});materials.push(m);
   await service.receipt(admin,{date:'2026-10-20',supplier:'Демо · Снабжение',document:'СТАРТ-'+materials.length,paid:false,lines:[{materialId:m.id,quantity,unitCost}]});
  }
  const [flour,sugar,butter,box]=materials;
  const cookie=await service.product(admin,{name:'Печенье сливочное',weight:2,priceForEmployee:150,salePrice:2000});
  const muffin=await service.product(admin,{name:'Кексы ванильные',weight:1,priceForEmployee:180,salePrice:2200});
  await Product.update({image:'/products/butter-cookies.jpg'},{where:{id:cookie.id}});await Product.update({image:'/products/vanilla-muffins.jpg'},{where:{id:muffin.id}});
  await M.ProductDisplay.create({productId:cookie.id,catalogVisible:true,description:'Рассыпчатое печенье на сливочном масле. Нежная ваниль и золотистая корочка. Упаковка — 2 кг.'});
  await M.ProductDisplay.create({productId:muffin.id,catalogVisible:true,description:'Нежные ванильные кексы с мягким мякишем. Для кофеен, магазинов и семейного чаепития. Упаковка — 1 кг.'});
  await service.recipe(admin,{productId:cookie.id,outputKg:10,priceForEmployee:150,overhead:500,lines:[{materialId:flour.id,quantity:6},{materialId:sugar.id,quantity:2},{materialId:butter.id,quantity:3},{materialId:box.id,quantity:5}]});
  await service.recipe(admin,{productId:muffin.id,outputKg:5,priceForEmployee:180,overhead:300,lines:[{materialId:flour.id,quantity:3},{materialId:sugar.id,quantity:1},{materialId:butter.id,quantity:1},{materialId:box.id,quantity:5}]});
  const second=await service.user(admin,{name:'Данияр · пекарь',email:'baker@demo.test',password:'CondDemo2026!',role:'employee'});
  for(const [productId,workerId,kg,day]of [[cookie.id,worker.id,60,'2026-10-21'],[cookie.id,worker.id,40,'2026-10-24'],[muffin.id,second.id,30,'2026-10-22'],[muffin.id,second.id,20,'2026-10-25']]){const p=await service.production(admin,{productId,workerId,kg,date:day});await service.postProduction(admin,p.id,{});}
  const shops=[];let customerId;
  for(const [name,address,company]of [['Сладкий день · Центр','Демо: ул. Центральная, 10','Демо · Сеть «Сладкий день»'],['Сладкий день · Север','Демо: ул. Северная, 25',null],['Кофейня «Утро»','Демо: пр. Утренний, 7','Демо · Кофейня «Утро»']]){
   const s=await trade.outlet(admin,{name,address,representativeId:rep.id,...(company?{customerName:company,debtScope:'company'}:{customerId})});shops.push(s);if(!customerId)customerId=s.customerId;
  }
  for(let i=0;i<5;i++){
   const day='2026-10-'+String(22+i),p=i%2?muffin:cookie,kg=6+i*2;
   const o=await service.order(rep,{outletId:shops[i%3].id,deliveryDate:day,lines:[{productId:p.id,kg}],note:'Демо · поставка по маршруту'});
   await service.orderStatus(admin,o.id,{status:'approved',prices:[p.id===cookie.id?2000:2200]});await service.orderStatus(admin,o.id,{status:'shipped'});
   // The public demo shows a complete week, using the dates of its sample deliveries.
   const shipped=await M.Order.findByPk(o.id);await shipped.update({shippedAt:new Date(day+'T08:00:00Z')});
   const link=await M.LegacyLink.findByPk(`shipment:${o.id}:${p.id}`);if(link?.data?.incomeId)await Income.update({date:new Date(day+'T08:00:00Z')},{where:{id:link.data.incomeId}});
  }
  const approved=await service.order(rep,{outletId:shops[0].id,deliveryDate:date,lines:[{productId:cookie.id,kg:6}],note:'Демо · товар согласован, можно отгружать'});await service.orderStatus(admin,approved.id,{status:'approved',prices:[2000]});
  await service.order(rep,{outletId:shops[1].id,deliveryDate:'2026-10-26',lines:[{productId:cookie.id,kg:300},{productId:muffin.id,kg:15}],note:'Демо · проверьте план производства перед согласованием'});
  await service.order(rep,{outletId:shops[2].id,deliveryDate:date,lines:[{productId:cookie.id,kg:4},{productId:muffin.id,kg:3}],note:'Демо · доставка утром'});
  await service.production(admin,{productId:cookie.id,workerId:worker.id,kg:15,date});
  await service.payment(admin,{workerId:worker.id,amount:5000,salaryMonth:month,date,note:'Демо · аванс'});await service.payment(admin,{workerId:second.id,amount:2000,salaryMonth:month,date,note:'Демо · аванс'});
  await service.expense(admin,{category:'Доставка',recipient:'Демо · перевозчик',name:'Доставка по торговому маршруту',amount:4500,date:'2026-10-25'});
  const audit=await require('../services/reconciliationService')(admin);if(!audit.ok)throw Error('Public demo reconciliation failed');
  await State.create({key:'public-demo-ready:v1',value:{date,version:1}});
  return {ready:true};
 });
};
