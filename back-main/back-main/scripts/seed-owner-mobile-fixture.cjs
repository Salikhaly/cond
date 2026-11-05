// Explicitly restricted to the disposable browser fixture; never accepts a working database.
require('dotenv').config();const database=process.argv[2];
if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('A named disposable phone database is required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
(async()=>{
 require('../src/app');const db=require('../src/database/sequelize'),M=require('../src/models/operations'),{Product,User}=require('../src/models/models'),ops=require('../src/services/operationsService'),day=require('../src/services/businessDay').today();
 const owner=(await User.findOne({where:{role:'super_admin'}})).toJSON(),rep=await User.findOne({where:{role:'representative'}}),worker=(await User.findOne({where:{role:'employee'}})).toJSON();
 if(await M.Order.count()||await M.ProductDisplay.count())throw Error('Fixture already has business scenarios; use a fresh disposable database');
 const cake=await ops.product(owner,{name:'Кексы ванильные',weight:2.5,priceForEmployee:100,pricePerKg:1200});
 const third=await ops.product(owner,{name:'Шоколадные пряники',weight:2.5,priceForEmployee:100,pricePerKg:1400});
 await require('../src/services/packCatalogService').ensureBasePacks();const products=await Product.findAll({order:[['id','ASC']]});
 for(const [i,p]of products.entries()){
  const perKg=[1000,1200,1400][i]||1400;await M.SellingPrice.upsert({productId:p.id,price:perKg});
  for(const pack of await M.ProductPack.findAll({where:{productId:p.id}}))await pack.update({salePrice:Math.round(Number(pack.capacityKg)*perKg*100)/100});
  await p.update({image:i===1?'/products/vanilla-muffins.jpg':'/products/butter-cookies.jpg'});
  await require('../src/services/productDisplayService').display(owner,p.id,{description:'Тестовый ассортимент для проверки телефона',catalogGroup:i===0?'Печенье':i===1?'Кексы':'Пряники',catalogVisible:i!==0});
 }
 const shop=await require('../src/services/tradeService').outlet(owner,{customerName:'UI · Магазины',name:'Кофейня «Утро»',address:'Тестовый адрес, 7',representativeId:rep.id});
 const pack=await M.ProductPack.findOne({where:{productId:products[0].id,capacityKg:2.5}});
 await M.ClientPrice.create({customerId:shop.customerId,outletId:shop.id,productId:products[0].id,packId:pack.id,price:2250,startsOn:day});
 await ops.receipt(owner,{supplier:'UI · Упаковка',document:'UI-BOXES',date:day,lines:[{materialId:pack.boxMaterialId,quantity:20,unitCost:30}]});
 const output=await ops.production(worker,{productId:products[0].id,packId:pack.id,boxes:3,date:day});await ops.postProduction(owner,output.id);
 console.log('Owner/storefront fixture prepared: three products, one shop, posted output, store-specific price');await db.close();void third;void cake;
})().catch(e=>{console.error(e);process.exitCode=1;});
