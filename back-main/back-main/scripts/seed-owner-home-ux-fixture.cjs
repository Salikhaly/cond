require('dotenv').config();
const database=process.argv[2];if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('Disposable phone database required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false',SYNC_AUTO:'false'});
const db=require('../src/database/sequelize');
(async()=>{
 require('../src/app');const M=require('../src/models/operations'),{User}=require('../src/models/models'),ops=require('../src/services/operationsService');
 const owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),date=require('../src/services/businessDay').today(),catalog=await ops.catalog(owner);
 const cookies=catalog.find(p=>p.name==='Печенье сливочное'),ready=catalog.find(p=>p.name==='UI · Выпуск после прихода');
 if(!cookies||!ready)throw Error('Seed the owner mobile and receipt/production fixtures first');
 const packed=ready.packs.find(p=>p.capacityKg===1),other=ready.packs.find(p=>p.capacityKg===2.5),cookie=cookies.packs.find(p=>p.capacityKg===2.5);
 if(!packed||!other||!cookie)throw Error('Expected pack sizes missing');
 async function order(label,line,approve=false){const company='UI · Главная · '+label+' · '+date;let o=await M.Order.findOne({where:{company,deliveryDate:date}});if(!o)o=await ops.order(owner,{company,deliveryDate:date,lines:[line]});if(approve&&o.status==='submitted')await ops.orderStatus(owner,o.id,{status:'approved',prices:[1750]});return o.id;}
 const readyId=await order('Есть коробки',{productId:ready.id,packId:packed.id,boxes:1});
 const needId=await order('Нужна фасовка',{productId:ready.id,packId:other.id,boxes:1});
 const reservedId=await order('Уже согласовано',{productId:cookies.id,packId:cookie.id,boxes:1},true);
 const orders=await M.Order.findAll({where:{deliveryDate:date}}),products=await ops.catalog(owner),{orderReadiness}=require('../../../front-main/front-main/src/operations/orderReadiness');
 const active=orders.filter(o=>['submitted','approved'].includes(o.status)),readyCount=active.filter(o=>orderReadiness(o.toJSON(),products).ready).length;
 console.log(JSON.stringify({database,date,ids:{readyId,needId,reservedId},active:active.length,ready:readyCount,need:active.length-readyCount}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
