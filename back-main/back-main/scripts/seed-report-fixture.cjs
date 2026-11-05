// Only runs on the disposable browser database after seed-owner-mobile-fixture.
require('dotenv').config();const database=process.argv[2];
if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('A named disposable phone database is required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
(async()=>{
 require('../src/app');const db=require('../src/database/sequelize'),M=require('../src/models/operations'),{User}=require('../src/models/models'),ops=require('../src/services/operationsService'),money=require('../src/services/moneyService'),fin=require('../src/services/tradeFinanceService');
 const owner=(await User.findOne({where:{role:'super_admin'}})).toJSON(),day=require('../src/services/businessDay').today(),shop=await M.Outlet.findOne();
 if(await M.Order.count()||await M.MoneyDocument.count())throw Error('Fixture already contains a report scenario');
 const products=await ops.catalog(owner),product=products.find(p=>p.name==='Печенье сливочное'),pack=product.packs.find(p=>Number(p.capacityKg)===2.5);
 await M.ClientPrice.update({price:4000},{where:{productId:product.id,packId:pack.id,outletId:shop.id}});
 const order=await ops.order(owner,{outletId:shop.id,deliveryDate:day,lines:[{productId:product.id,packId:pack.id,boxes:2}]});
 await ops.orderStatus(owner,order.id,{status:'approved',prices:[4000]});await ops.orderStatus(owner,order.id,{status:'shipped'});
 await money.ensure();
 await require('../src/services/expenseArticleService').ensure();const article=await M.ExpenseArticle.findOne({where:{name:'Доставка',parentId:null}});
 await require('../src/services/expenseService').create(owner,{articleId:article.id,name:'Доставка тестовой партии',amount:250,date:day,method:'kaspi',accountId:money.defaultIds.kaspi,recipient:'Тест · курьер'});
 await fin.payment(owner,{partyType:'customer',partyId:shop.customerId,outletId:shop.id,amount:6000,date:day,method:'cash',accountId:money.defaultIds.cash,allocations:[{documentId:order.id,amount:6000}],comment:'Тест · частичная оплата'});
 const data=JSON.parse(JSON.stringify(await ops.dashboard(owner))),f=require('../../../front-main/front-main/src/operations/financialMetrics').financialMetrics(data,day,day);
 console.log(JSON.stringify({sales:f.margin.revenue,cost:f.margin.knownCost,operating:f.operating,result:f.profit,complete:f.complete,order:order.id}));await db.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
