require('dotenv').config();process.env.TELEGRAM_ENABLED='false';
const assert=require('assert/strict'),{Client}=require('pg'),{randomUUID}=require('crypto');
const database='cond_bonus_test_'+Date.now(),pg=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:'postgres'});let db,server,created=false,n=0;
const check=(v,label)=>{assert.ok(v,label);n++;console.log('PASS '+label);};
async function main(){
 await pg.connect();await pg.query('CREATE DATABASE "'+database+'"');created=true;delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false'});
 require('../src/app');db=require('../src/database/sequelize');await db.sync();await require('../src/database/seedLocal')();
 const M=require('../src/models/operations'),{User,Product,Salary}=require('../src/models/models'),ops=require('../src/services/operationsService'),fin=require('../src/services/tradeFinanceService'),bonus=require('../src/services/clientBonusService'),idem=require('../src/services/idempotency');
 const users=await User.findAll(),admin=users.find(u=>u.role==='super_admin').toJSON(),worker=users.find(u=>u.role==='employee').toJSON(),rep=users.find(u=>u.role==='representative').toJSON(),p=await Product.findOne(),date=require('../src/services/businessDay').today();
 await require('../src/services/packCatalogService').ensureBasePacks();const packs=await M.ProductPack.findAll({where:{productId:p.id}}),a=packs.find(p=>Number(p.capacityKg)===2.5),b=packs.find(p=>Number(p.capacityKg)===1.5);
 for(const pack of [a,b]){const box=await M.Material.findByPk(pack.boxMaterialId);await box.update({quantity:100,unitCost:25});const out=await ops.production(worker,{productId:p.id,packId:pack.id,boxes:4,date});await ops.postProduction(admin,out.id);}
 const shop=await require('../src/services/tradeService').outlet(admin,{customerName:'Бонус · клиент',name:'Бонус · магазин',address:'Тест',representativeId:rep.id});
 const order=await ops.order(admin,{outletId:shop.id,deliveryDate:date,lines:[{productId:p.id,packId:a.id,boxes:1},{productId:p.id,packId:b.id,boxes:1}]});await ops.orderStatus(admin,order.id,{status:'approved',prices:[2000,3000]});await ops.orderStatus(admin,order.id,{status:'shipped'});
 check(await M.CostEvent.count({where:{orderId:order.id,kind:'shipment'}})===1,'Multi-pack shipment creates one product cost event');
 let dashboard=JSON.parse(JSON.stringify(await ops.dashboard(admin)));const margin=require('../../../front-main/front-main/src/operations/marginMetrics').marginMetrics(dashboard);check(Math.abs(margin.knownCost-Number((await M.CostEvent.findOne({where:{orderId:order.id}})).value))<.001,'Report allocates multi-pack cost exactly once');
 const before=Number((await M.Stock.findByPk(p.id)).kg),wages=Number(await Salary.sum('total_amount')),debt=(await fin.visible(admin)).clients.find(c=>c.customerId===shop.customerId).debt;
 const body={kind:'goods',customerId:shop.customerId,sourceOrderId:order.id,date,lines:[{productId:p.id,packId:a.id,boxes:1},{productId:p.id,packId:b.id,boxes:1}]},req={user:admin,headers:{'x-operation-id':randomUUID()},method:'POST',path:'/client-bonuses',body};
 const first=await idem(req,()=>bonus.save(admin,body)),again=await idem(req,()=>bonus.save(admin,body));
 check(first.id===again.id&&await M.ClientBonus.count()===1,'Retry creates one bonus with one stock shipment');
 check(Number((await M.Stock.findByPk(p.id)).kg)===before-4,'Bonus writes off actual boxes and four kilograms');
 check((await fin.visible(admin)).clients.find(c=>c.customerId===shop.customerId).debt===debt,'Bonus goods do not reduce or increase client debt');
 check(Number(await Salary.sum('total_amount'))===wages,'Giving finished bonus goods does not pay workers again');
 dashboard=JSON.parse(JSON.stringify(await ops.dashboard(admin)));const rows=require('../../../front-main/front-main/src/operations/deliveryMetrics').deliveryMetrics(dashboard);check(rows.length===1&&rows[0].bonusKg===4&&rows[0].cost>rows[0].bonusCost,'Bonus cost joins the source delivery result');
 const docCount=await M.Order.count(),kg=Number((await M.Stock.findByPk(p.id)).kg);
 await assert.rejects(()=>bonus.save(admin,{...body,lines:[{productId:p.id,packId:a.id,boxes:999}]}));check(await M.Order.count()===docCount&&Number((await M.Stock.findByPk(p.id)).kg)===kg,'Insufficient stock rolls back the full bonus and order');
 await assert.rejects(()=>bonus.save(rep,body));await assert.rejects(()=>bonus.save(worker,body));await assert.rejects(()=>bonus.save(admin,{...body,sourceOrderId:first.goods.shipmentOrderId}));check(true,'Workers, representatives and recursive bonus sources are rejected');
 const returns=require('../src/services/returnsService'),r=await returns.create(rep,{orderId:first.goods.shipmentOrderId,contactName:'Тест',reason:'Возврат бонусного товара',preferredSettlement:'debt',lines:[{productId:p.id,kg:4}]});await returns.post(admin,r.id,{received:true,decisions:[{productId:p.id,kind:'inspection'}]});check(Number((await M.GoodsReturn.findByPk(r.id)).total)===0,'All bonus pack sizes return with zero refund value');
 const paidReturn=await returns.create(rep,{orderId:order.id,contactName:'Тест',reason:'Проверка цены коробки',preferredSettlement:'debt',lines:[{productId:p.id,kg:4}]});check(Number(paidReturn.total)===5000,'Return of boxed shipment never multiplies box price by kilograms');
 server=require('http').createServer(require('../src/app'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const tokens=new Map();for(const u of [admin,rep,worker]){const pair=require('../src/services/tokenService').generateToken({id:u.id,email:u.email,name:u.name,role:u.role});await require('../src/services/tokenService').saveToken(u.id,pair.refreshToken);tokens.set(u.id,pair.accessToken);}const call=async(u,id,payload=body)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/operations/client-bonuses',{method:'POST',headers:{Authorization:'Bearer '+tokens.get(u.id),'Content-Type':'application/json',...(id?{'x-operation-id':id}:{})},body:JSON.stringify(payload)});return {status:response.status,data:await response.json()};};
 check((await call(admin,req.headers['x-operation-id'])).data.id===first.id,'Authenticated HTTP retry returns the existing bonus');
 check((await call(admin)).status===400,'HTTP refuses bonus posting without a persistent operation ID');
 check((await call(rep,randomUUID())).status===403&&(await call(worker,randomUUID())).status===403,'HTTP prevents representatives and workers issuing bonuses');
 await require('../src/database/upgradeOperations')();check(await M.ClientBonus.count()===1,'Additive upgrade preserves bonus history');
 console.log(n+' goods bonus checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));if(db)await db.close();if(created)await pg.query('DROP DATABASE "'+database+'" WITH (FORCE)');await pg.end();});
