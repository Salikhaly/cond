require('dotenv').config();process.env.TELEGRAM_ENABLED='false';
const assert=require('assert/strict'),{Client}=require('pg');
const database='cond_stock_value_test_'+Date.now(),owner=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:'postgres'});
let db,created=false,n=0;const check=(v,label)=>{assert.ok(v,label);n++;console.log('PASS '+label);},near=(a,b)=>Math.abs(Number(a)-Number(b))<.001;
async function main(){
 await owner.connect();await owner.query('CREATE DATABASE "'+database+'"');created=true;delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false'});
 require('../src/models/models');const M=require('../src/models/operations');db=require('../src/database/sequelize');await db.sync();await require('../src/database/seedLocal')();
 const {User,Product}=require('../src/models/models'),ops=require('../src/services/operationsService'),returns=require('../src/services/returnsService'),valuation=require('../src/services/stockValueService');
 const users=await User.findAll(),admin=users.find(u=>u.role==='super_admin').toJSON(),worker=users.find(u=>u.role==='employee').toJSON(),rep=users.find(u=>u.role==='representative').toJSON(),p=await Product.findOne(),material=await M.Material.findOne({where:{name:'Мука пшеничная'}}),recipe=await M.Recipe.findOne({where:{productId:p.id}}),date='2026-10-29';
 await p.update({priceForEmployee:0});await material.update({unitCost:100});await recipe.update({outputKg:1,lines:[{materialId:material.id,quantity:1}],overhead:0});
 const produce=async kg=>{const x=await ops.production(worker,{productId:p.id,kg,date});await ops.postProduction(admin,x.id);return x;};
 const ship=async(kg,productId=p.id)=>{const x=await ops.order(admin,{company:'Проверка оценки',deliveryDate:date,lines:[{productId,kg}]});await ops.orderStatus(admin,x.id,{status:'approved',prices:[1000]});await ops.orderStatus(admin,x.id,{status:'shipped'});return x;};
 await produce(10);await material.update({unitCost:200});await produce(10);
 let v=await M.StockValue.findByPk(p.id);check(near(v.kg,20)&&near(v.knownKg,20)&&near(v.value,3000),'Two batches 10×100 + 10×200 form weighted stock 20kg / 3000');
 const first=await ship(4);let event=await M.CostEvent.findByPk(`shipment:${first.id}:${p.id}`);v=await M.StockValue.findByPk(p.id);
 check(near(event.value,600)&&near(v.value,2400)&&near(v.kg,16),'Shipment fixes WAC cost 4×150 and leaves 16kg / 2400');
 await material.update({unitCost:900});await recipe.update({overhead:999});await p.update({priceTotal:12345});await event.reload();check(near(event.value,600),'Recipe, catalog and purchase changes do not restate old shipment');
 const r=await returns.create(rep,{orderId:first.id,contactName:'Тест',reason:'Проверка оценки',preferredSettlement:'credit',lines:[{productId:p.id,kg:2}],replacements:[]}).catch(()=>returns.create(admin,{orderId:first.id,contactName:'Тест',reason:'Проверка оценки',preferredSettlement:'credit',lines:[{productId:p.id,kg:2}],replacements:[]}));
 await returns.post(admin,r.id,{received:true,decisions:[{productId:p.id,kind:'inspection'}]});let accepted=await M.CostEvent.findByPk(`return:${r.id}:${p.id}`);v=await M.StockValue.findByPk(p.id);
 check(near(accepted.value,300)&&near(v.kg,16)&&near(v.value,2400),'Inspection reverses original 300 cost into quarantine, not saleable stock');
 await returns.resolve(admin,r.id,{productId:p.id,kg:1,kind:'sale',reason:'Проверен'});v=await M.StockValue.findByPk(p.id);check(near(v.kg,17)&&near(v.value,2550),'Release from inspection restores original 150 into saleable stock');
 await returns.resolve(admin,r.id,{productId:p.id,kg:1,kind:'scrap',reason:'Брак'});v=await M.StockValue.findByPk(p.id);const scrap=await M.CostEvent.findOne({where:{returnId:r.id,kind:'return-scrap'}});
 check(near(scrap.value,150)&&near(v.kg,17)&&near(v.value,2550),'Scrap records separate original-cost loss and does not increase stock');
 const before=await M.CostEvent.count();await assert.rejects(()=>returns.resolve(admin,r.id,{productId:p.id,kg:1,kind:'sale',reason:'Лишний'}));check(await M.CostEvent.count()===before,'Over-resolution rolls back both stock and cost journal');
 const exchange=await returns.create(admin,{orderId:first.id,contactName:'Тест',reason:'Обмен',preferredSettlement:'credit',lines:[{productId:p.id,kg:1}],replacements:[{productId:p.id,kg:1}]});await returns.post(admin,exchange.id,{received:true,decisions:[{productId:p.id,kind:'sale'}],prices:[1000]});await exchange.reload();
 event=await M.CostEvent.findByPk(`shipment:${exchange.exchangeOrderId}:${p.id}`);check(near(event.value,150),'Replacement shipment has its own immutable cost snapshot');
 await assert.rejects(()=>ops.orderStatus(admin,first.id,{status:'shipped'}));check(await M.CostEvent.count({where:{id:`shipment:${first.id}:${p.id}`}})===1,'Repeated shipment cannot duplicate cost depletion');
 const old=await Product.create({name:'Старый неоценённый',weight:1,weightTotal:10,quantity:10,priceForEmployee:0,priceTotal:777,ingredients:[],additional:[]});await M.Stock.create({productId:old.id,kg:10});await M.Recipe.create({productId:old.id,outputKg:1,overhead:0,lines:[{materialId:material.id,quantity:1}]});await material.update({unitCost:100});
 const oldP=await ops.production(worker,{productId:old.id,kg:10,date});await ops.postProduction(admin,oldP.id);const mixed=await ship(4,old.id);event=await M.CostEvent.findByPk(`shipment:${mixed.id}:${old.id}`);check(near(event.kg,4)&&near(event.knownKg,2)&&near(event.value,200),'Unknown opening stock remains unknown and is not valued at catalog cost');
 await ship(16,old.id);v=await M.StockValue.findByPk(old.id);check(near(v.kg,0)&&near(v.knownKg,0)&&near(v.value,0),'Full depletion conserves known cost and clears all balances');
 const fresh=await ops.production(worker,{productId:old.id,kg:1,date});await ops.postProduction(admin,fresh.id);const clean=await ship(1,old.id);event=await M.CostEvent.findByPk(`shipment:${clean.id}:${old.id}`);check(near(event.knownKg,1)&&near(event.value,100),'New batch after depletion is fully valued');
 const rejected=await ops.production(worker,{productId:p.id,kg:100000,date}),count=await M.CostEvent.count();await assert.rejects(()=>ops.postProduction(admin,rejected.id));check(await M.CostEvent.count()===count,'Failed production does not leave cost events');
 for(const u of [rep,worker]){const view=await ops.dashboard(u);check(!view.costEvents&&!view.stockValues,'Cost journal is hidden from '+u.role);}
 const dashboard=await ops.dashboard(admin);check(dashboard.incomes.some(i=>i.orderId===first.id),'Sales rows retain shipment identity for reliable report matching');
 const snapshot=await db.transaction({isolationLevel:'REPEATABLE READ'},t=>valuation.readData(t));check(snapshot.costEvents.length>0&&snapshot.stockValues.length===2,'Coherent valuation snapshot contains journal and physical balances');
 const recon=await require('../src/services/reconciliationService')(admin);check(recon.ok,'Expanded stock, return, wage and cost reconciliation: '+recon.issues.join('; '));
 // The original return locks its invoice; simultaneous receipts cannot exceed shipment kg.
 const concurrent=await ship(1);const req=()=>returns.create(admin,{orderId:concurrent.id,contactName:'Тест',reason:'Конкурентно',preferredSettlement:'credit',lines:[{productId:p.id,kg:.75}],replacements:[]});const a=await req(),b=await req();
 const results=await Promise.allSettled([a,b].map(x=>returns.post(admin,x.id,{received:true,decisions:[{productId:p.id,kind:'sale'}]})));check(results.filter(x=>x.status==='fulfilled').length===1,'Concurrent returns cannot restore more value than shipped');
 console.log('\n'+n+' cost checks passed in isolated database '+database);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(db)await db.close();if(created)await owner.query('DROP DATABASE "'+database+'" WITH (FORCE)');await owner.end();});
