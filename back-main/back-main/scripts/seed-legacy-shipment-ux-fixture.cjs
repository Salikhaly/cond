require('dotenv').config();
const database=process.argv[2];if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('Disposable phone database required');delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false',SYNC_AUTO:'false'});
const db=require('../src/database/sequelize');
(async()=>{require('../src/app');const M=require('../src/models/operations'),{User,Product}=require('../src/models/models'),ops=require('../src/services/operationsService'),owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),worker=(await User.findOne({where:{email:'worker@local.test'}})).toJSON(),date=require('../src/services/businessDay').today();
 let product=await Product.findOne({where:{name:'UI · Отгрузка в кг'}});
 if(!product){
  const material=await ops.material(owner,{name:'UI · Материал для отгрузки кг',unit:'кг'});await ops.receipt(owner,{supplier:'UI · Коробки и кг',document:'LEGACY-SHIP-RAW',date,lines:[{materialId:material.id,quantity:10,unitCost:10}]});
  product=await ops.product(owner,{name:'UI · Отгрузка в кг',weight:1,priceForEmployee:50,pricePerKg:2000});await ops.recipe(owner,{productId:product.id,outputKg:1,overhead:0,priceForEmployee:50,lines:[{materialId:material.id,quantity:1}],expectedVersion:0});
 }
 const pack=(await ops.catalog(owner)).find(p=>p.id===product.id).packs.find(p=>p.capacityKg===1);
 if(!await M.ReceiptDocument.findOne({where:{document:'LEGACY-SHIP-BOX'}}))await ops.receipt(owner,{supplier:'UI · Коробки и кг',document:'LEGACY-SHIP-BOX',date,lines:[{materialId:pack.boxMaterialId,quantity:10,unitCost:20}]});
 if(Number(pack.filmQtyM)>0){if(!pack.filmMaterialId)throw Error('Select a film in shared settings before seeding');if(!await M.ReceiptDocument.findOne({where:{document:'LEGACY-SHIP-FILM'}}))await ops.receipt(owner,{supplier:'UI · Коробки и кг',document:'LEGACY-SHIP-FILM',date,lines:[{materialId:pack.filmMaterialId,quantity:10,unitCost:20}]});}
 if(!await M.Production.findOne({where:{productId:product.id}})){const output=await ops.production(worker,{productId:product.id,packId:pack.id,boxes:4,date});await ops.postProduction(owner,output.id);}
 let order=await M.Order.findOne({where:{company:'UI · Старая заявка в кг'}});if(!order){order=await ops.order(owner,{company:'UI · Старая заявка в кг',deliveryDate:date,lines:[{productId:product.id,kg:2}]});await ops.orderStatus(owner,order.id,{status:'approved',prices:[2000]});}
 await order.reload();
 let exchange=await M.GoodsReturn.findOne({where:{orderId:order.id,reason:'UI · Обмен коробок по кг'}});
 if(process.argv.includes('--exchange-seed')&&!exchange){if(order.status!=='shipped')throw Error('Ship the legacy order before creating exchange request');exchange=await require('../src/services/returnsService').create(owner,{orderId:order.id,lines:[{productId:product.id,kg:1}],replacements:[{productId:product.id,kg:1}],preferredSettlement:'credit',contactName:'UI · Проверка',reason:'UI · Обмен коробок по кг'});}
 let split=await M.Order.findOne({where:{company:'UI · Дробная отгрузка со вскрытием'}});
 if(process.argv.includes('--split-seed')&&!split){split=await ops.order(owner,{company:'UI · Дробная отгрузка со вскрытием',deliveryDate:date,lines:[{productId:product.id,kg:.5}]});await ops.orderStatus(owner,split.id,{status:'approved',prices:[2000]});await split.reload();}
 const p=(await ops.catalog(owner)).find(p=>p.id===product.id),currentPack=p.packs.find(p=>p.capacityKg===1);
 if(process.argv.includes('--check')){await order.reload();const expected=split?.status==='shipped' ? .5 : exchange?.status==='posted'?1:2,expectedBoxes=split?.status==='shipped'?0:expected;if(order.status!=='shipped'||Number(p.kg)!==expected||currentPack.boxes!==expectedBoxes||Number(order.total)!==4000||order.lines[0].shipmentPacks?.[0]?.boxes!==2||!(await require('../src/services/reconciliationService')(owner)).ok)throw Error('Legacy shipment fixture has not completed correctly');}
 console.log(JSON.stringify({database,productId:product.id,orderId:order.id,packId:pack.id,kg:Number(p.kg),boxes:currentPack.boxes,status:order.status,total:Number(order.total),exchangeId:exchange?.id,exchangeStatus:exchange?.status,splitId:split?.id,splitStatus:split?.status}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
