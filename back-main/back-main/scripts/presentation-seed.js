require('dotenv').config();
const {Client}=require('pg');
const {createHash}=require('crypto');
const db=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
const base='http://127.0.0.1:3002/api/operations';
function key(step){const h=createHash('sha256').update('cond-presentation-v1:'+step).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}
async function call(token,path,body,step,method){const r=await fetch(base+path,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(step?{'X-Operation-Id':key(step)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw new Error(path+': '+data.message);return data;}
async function main(){
 if(!/^cond_presentation_\d{8}$/.test(process.env.DB_NAME||''))throw new Error('Presentation seed is allowed only in its separate dated database');
 const health=await (await fetch('http://127.0.0.1:3002/api/health')).json();if(!health.presentation || health.presentationDate!==process.env.DB_NAME.slice(-8))throw new Error('Port 3002 is not the expected presentation server');
 await db.connect();if((await db.query("SELECT 1 FROM sync_states WHERE key='presentation-ready'")).rowCount){console.log('Presentation data already prepared; kept existing records.');return;}
 const stamp=process.env.DB_NAME.slice(-8),date=`${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)}`;
 const admin=(await call(null,'/session',{email:'admin@local.test',password:'Local2026!demo'})).accessToken;
 const firm=(await call(null,'/session',{email:'firm@local.test',password:'Local2026!demo'})).accessToken;
 const data=await call(admin,'/dashboard');const cookie=data.products.find(p=>p.name==='Печенье сливочное'),worker=data.workers.find(w=>w.email==='worker@local.test');
 if(!cookie || !worker)throw new Error('Initial presentation product or worker is missing');
 const material=name=>data.materials.find(m=>m.name===name).id;
 const flour=material('Мука пшеничная'),sugar=material('Сахар'),butter=material('Масло сливочное'),box=material('Коробка для печенья');
 await call(admin,'/receipts',{supplier:'Демо · Поставщик сырья',document:'ДЕМО-001',date,paid:false,lines:[{materialId:flour,quantity:20,unitCost:280},{materialId:sugar,quantity:10,unitCost:420},{materialId:box,quantity:20,unitCost:120}]},'receipt');
 const second=await call(admin,'/users',{name:'Данияр · пекарь',email:'baker@local.test',password:'Local2026!demo',role:'employee'},'worker');
 const muffin=await call(admin,'/products',{name:'Кексы ванильные',weight:1,priceForEmployee:180},'product');
 await call(admin,'/recipes',{productId:muffin.id,outputKg:5,overhead:300,priceForEmployee:180,lines:[{materialId:flour,quantity:3},{materialId:sugar,quantity:1},{materialId:butter,quantity:1},{materialId:box,quantity:5}]},'recipe');
 for(const [tag,productId,workerId,kg]of [['cookies',cookie.id,worker.id,60],['muffins',muffin.id,second.id,15]]){const p=await call(admin,'/productions',{productId,workerId,kg,date},tag+'-draft');await call(admin,`/productions/${p.id}/post`,{},tag+'-post');}
 for(const [tag,workerId,amount]of [['cookies',worker.id,2000],['muffins',second.id,500]])await call(admin,'/payments',{workerId,amount,date,salaryMonth:date.slice(0,7),note:'Демо · аванс, наличные'},tag+'-advance');
 await call(firm,'/orders',{lines:[{productId:cookie.id,kg:8},{productId:muffin.id,kg:3}],deliveryDate:date,note:'Демо · новая заявка: доставка утром'},'submitted');
 const approved=await call(admin,'/orders',{company:'Демо · Магазин «Сладкий день»',lines:[{productId:cookie.id,kg:6}],deliveryDate:date,note:'Демо · можно отгружать'},'approved-order');
 await call(admin,`/orders/${approved.id}`,{status:'approved',prices:[2000]},'approved-prices','PATCH');
 const shipped=await call(firm,'/orders',{lines:[{productId:cookie.id,kg:4}],deliveryDate:date,note:'Демо · выполненная отгрузка'},'shipped-order');
 await call(admin,`/orders/${shipped.id}`,{status:'approved',prices:[2000]},'shipped-prices','PATCH');await call(admin,`/orders/${shipped.id}`,{status:'shipped'},'shipped-confirm','PATCH');
 const draft=await call(admin,'/productions',{productId:cookie.id,workerId:worker.id,kg:5,date},'pending-output');
 const audit=await call(admin,'/reconciliation');if(!audit.ok)throw new Error('Presentation reconciliation failed: '+audit.issues.join('; '));
 await db.query("INSERT INTO sync_states(key,value,\"createdAt\",\"updatedAt\") VALUES ('presentation-ready',$1,now(),now())",[JSON.stringify({date,version:1,pendingProduction:draft.id})]);
 console.log('Presentation ready: two products, two workers, new/approved/shipped orders, monthly advances; reconciliation passed.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
