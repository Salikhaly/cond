// Only a disposable phone database; never the public demo or working database.
require('dotenv').config();
const database=process.argv[2];
if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('Disposable phone database required');
delete process.env.DATABASE_URL;
Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
const db=require('../src/database/sequelize');
(async()=>{
 require('../src/app');
 const M=require('../src/models/operations'),{User,Product}=require('../src/models/models'),ops=require('../src/services/operationsService');
 const owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),worker=(await User.findOne({where:{email:'worker@local.test'}})).toJSON();
 const [material]=await M.Material.findOrCreate({where:{name:'UI · Сырьё для проверки выпуска'},defaults:{unit:'кг',quantity:0,unitCost:0,kind:'raw'}});
 let product=await Product.findOne({where:{name:'UI · Выпуск после прихода'}});
 if(!product){product=await ops.product(owner,{name:'UI · Выпуск после прихода',weight:1,priceForEmployee:50,pricePerKg:1000});await ops.recipe(owner,{productId:product.id,outputKg:1,overhead:5,priceForEmployee:50,lines:[{materialId:material.id,quantity:.5}],expectedVersion:0});}
 const pack=await M.ProductPack.findOne({where:{productId:product.id,capacityKg:1}});
 let output=await M.Production.findOne({where:{productId:product.id}});
 if(!output)output=await ops.production(worker,{productId:product.id,packId:pack.id,boxes:2,date:require('../src/services/businessDay').today()});
 console.log(JSON.stringify({database,productionId:output.id,materialId:material.id,productId:product.id,boxes:2,expectedReceiptKg:1}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
