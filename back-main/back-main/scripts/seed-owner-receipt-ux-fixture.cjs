require('dotenv').config();
const database=process.argv[2];if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('Disposable phone database required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
const db=require('../src/database/sequelize');
(async()=>{
 require('../src/app');const M=require('../src/models/operations'),{User}=require('../src/models/models'),ops=require('../src/services/operationsService'),counts=require('../src/services/stockCountService');
 const owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),date=require('../src/services/businessDay').today();
 let old=await M.Material.findOne({where:{name:'UI · Мука прежняя'}}),replacement=await M.Material.findOne({where:{name:'UI · Мука новая'}});
 if(!old)old=await ops.material(owner,{name:'UI · Мука прежняя',unit:'кг'});
 if(!replacement)replacement=await ops.material(owner,{name:'UI · Мука новая',unit:'кг'});
 let receipt=await M.ReceiptDocument.findOne({where:{document:'UX-REPEAT-ORIGINAL'}});
 if(!receipt){receipt=await ops.receipt(owner,{date,supplier:'UI · Повтор поставки',document:'UX-REPEAT-ORIGINAL',paid:true,lines:[{materialId:old.id,quantity:10,unitCost:100}]});const count=await counts.create(owner,{date,lines:[{kind:'material',itemId:old.id,actualQty:0}]});await counts.post(owner,count.id,{confirmed:true,expectedUpdatedAt:count.updatedAt.toISOString()});await old.update({active:false});}
 await M.Material.findOrCreate({where:{name:'UI · Сырьё без цены для ревизии'},defaults:{unit:'кг',kind:'raw',quantity:0,unitCost:0}});
 console.log(JSON.stringify({database,originalReceiptId:receipt.id,oldMaterialId:old.id,replacementMaterialId:replacement.id,expectedNewQuantity:10,expectedNewUnitCost:120,expectedNewTotal:1200,expectedPayment:500,expectedDebt:700}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
