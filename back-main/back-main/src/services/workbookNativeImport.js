// Historical documents enter native journals atomically; warehouse opening balances
// and missing recipes are deliberately not inferred from historical purchases.
const {randomUUID,createHash}=require('crypto');
const db=require('../database/sequelize'),L=require('../models/models'),M=require('../models/operations'),{State}=require('../models/sync');
const source=require('../database/historyFebruary2025'),{plan,key}=require('./workbookOperationalPlan');
const marker='native-workbook:'+source.id+':v1',round=n=>Math.round(Number(n)*100)/100;
const trace=(type,value)=>'workbook:'+createHash('sha256').update(source.id+':'+type+':'+value).digest('hex');
async function importNative(){
 if(process.env.PUBLIC_DEMO!=='true')throw Error('Native workbook seed requires isolated demo');
 return db.transaction(async transaction=>{
  await db.query('SELECT pg_advisory_xact_lock(42810301)',{transaction});
  const existing=await State.findByPk(marker,{transaction});if(existing)return existing.value;
  const p=plan(source),opts={transaction,returning:true},links=[],uuid=randomUUID;
  const admin=await L.User.findOne({where:{email:'admin@demo.test'},transaction}),rep=await L.User.findOne({where:{email:'firm@demo.test'},transaction});
  if(!admin||!rep)throw Error('Seed demo accounts first');
  const products=await L.Product.bulkCreate(p.products.map(x=>({name:x.name,weight:x.unit==='шт'?1:x.weight,priceTotal:0,weightTotal:0,priceForEmployee:p.acts.find(a=>a.product===x.key)?.rate||0,quantity:0,is_active:x.sellable&&x.unit!=='шт',ingredients:[],additional:{sourceWorkbook:source.name,unit:x.unit,stockVerified:false}})),opts);
  const productMap=new Map(p.products.map((x,i)=>[x.key,products[i]]));
  await M.ProductDisplay.bulkCreate(products.map(x=>({productId:x.id,description:'Из учёта за февраль 2025. Состав в Excel не указан; остаток требует сверки.'})),opts);
  await M.Stock.bulkCreate(products.map(x=>({productId:x.id,kg:0,reservedKg:0})),opts);
  const workers=await L.User.bulkCreate(p.workers.map((x,i)=>({name:x.name,email:'feb2025-'+i+'@history.demo.test',role:'employee',password:null,email_confirmed:new Date()})),opts),workerMap=new Map(p.workers.map((x,i)=>[x.key,workers[i]]));
  // Historical employees do not gain a public login with the owner's password.
  await M.Access.bulkCreate(workers.map(x=>({userId:x.id,disabled:true})),opts);
  await M.WorkProfile.bulkCreate(workers.map(x=>({userId:x.id,position:'Производство',weekDays:[]})),opts);
  const names=[...new Set(p.sales.map(s=>s.party))],customers=await M.Customer.bulkCreate(names.map(name=>({name,debtScope:'company'})),opts),customerMap=new Map(names.map((n,i)=>[n,customers[i]]));
  const outlets=await M.Outlet.bulkCreate(customers.map(c=>({id:uuid(),customerId:c.id,name:c.name,address:'Адрес не указан · уточните',representativeId:rep.id})),opts),outletMap=new Map(outlets.map(o=>[o.customerId,o]));
  const relations=await L.BusinessRelation.bulkCreate(names.map(name=>({name,category:'clients',is_active:true})),opts),relationMap=new Map(names.map((n,i)=>[n,relations[i]]));
  const orders=[],destinations=[],incomeRows=[],incomeLinks=[],cash=[],allocations=[],prices=new Map();
  for(const s of p.sales){const id=uuid(),c=customerMap.get(s.party),o=outletMap.get(c.id),lines=s.lines.map(l=>({productId:productMap.get(l.product).id,name:l.name,kg:l.quantity,price:l.price,unit:l.unit}));
   orders.push({id,userId:rep.id,company:s.party,status:'shipped',lines,note:'История · '+source.name,deliveryDate:s.date,total:s.total,shippedAt:new Date(s.date+'T12:00:00+05:00')});
   destinations.push({orderId:id,outletId:o.id,customerId:c.id,customerName:c.name,outletName:o.name,address:o.address,representativeName:rep.name});
   for(const l of s.lines){const product=productMap.get(l.product);incomeRows.push({productId:product.id,businessRelationId:relationMap.get(s.party).id,weight:l.unit==='шт'?1:l.factor,quantity:l.unit==='шт'?l.quantity:l.count,totalWeight:l.unit==='шт'?0:l.quantity,unitPrice:l.price,totalAmount:l.amount,date:s.date});incomeLinks.push({orderId:id,productId:product.id,source:l});prices.set(c.id+':'+product.id,{customerId:c.id,productId:product.id,price:l.price,startsOn:s.date,actorId:admin.id,actorName:admin.name});}
   if(s.paid){const entryId=uuid();cash.push({id:entryId,kind:'opening-credit',direction:'in',partyKey:'customer:'+c.id,partyName:c.name,amount:s.total,date:s.date,method:'unknown',comment:'Отметка «опл» в Excel. Дата получения и счёт не указаны; не новое поступление денег.',actorId:admin.id,actorName:admin.name});allocations.push({entryId,documentType:'order',documentId:id,amount:s.total});}
   links.push({id:trace('sale',s.key),data:{source:source.name,orderId:id}});
  }
  await M.Order.bulkCreate(orders,opts);await M.Destination.bulkCreate(destinations,opts);
  const incomes=await L.Income.bulkCreate(incomeRows,opts);
  incomes.forEach((income,i)=>{const l=incomeLinks[i];links.push({id:'shipment:'+l.orderId+':'+l.productId,data:{incomeId:income.id,source:l.source.key,unit:l.source.unit}});});
  await M.ClientPrice.bulkCreate([...prices.values()],opts);
  await M.SellingPrice.bulkCreate(products.map(product=>({productId:product.id,price:[...prices.values()].find(x=>x.productId===product.id)?.price??null})),opts);
  const adal=customers.find(c=>key(c.name).includes('адал'));if(adal)await M.ClientDebt.create({partyKey:'customer:'+adal.id,partyName:adal.name,total:210000,date:'2025-02-01',reason:'Лист «адал»: остаток прежнего долга 210 000 ₸. Дата — начало периода переноса; не новая продажа.',actorId:admin.id,actorName:admin.name},opts);
  const [category]=await L.OutcomeCategory.findOrCreate({where:{name:'Февраль 2025 · требуется разбор'},transaction});
  const outcomes=await L.Outcome.bulkCreate(p.expenses.map(e=>({recipient:e.party,name:e.name,weight:e.factor||null,unitPrice:e.price,quantity:Math.max(1,Math.round(e.count||1)),totalAmount:e.amount,date:e.date,outcomeCategoryId:category.id})),opts);
  await M.ExpenseMeta.bulkCreate(p.expenses.map((e,i)=>({outcomeId:outcomes[i].id,kind:e.kind,category:e.party,subcategory:e.name,method:'unknown',comment:source.name+' · '+e.sheet+' · строка '+e.row,actorId:admin.id,actorName:admin.name})),opts);
  outcomes.forEach((o,i)=>links.push({id:trace('expense',p.expenses[i].key),data:{outcomeId:o.id,source:p.expenses[i].key}}));
  const supplierNames=[...new Set(p.expenses.filter(e=>e.kind==='inventory').map(e=>e.party))],suppliers=await M.Supplier.bulkCreate(supplierNames.map(name=>({name,comment:'Поставщик из февраля 2025'})),opts),supplierMap=new Map(suppliers.map(s=>[s.name,s]));
  const materialNames=[...new Set(p.expenses.filter(e=>e.kind==='inventory').map(e=>e.name))],materials=[];
  for(const name of materialNames){const [m]=await M.Material.findOrCreate({where:{name},defaults:{unit:/коробк/i.test(name)?'шт':/поф|пленк|суйык/i.test(name)?'ед':'кг',quantity:0,unitCost:0},transaction});materials.push(m);}
  const materialMap=new Map(materials.map(m=>[m.name,m])),receipts=[],receiptFinance=[];
  p.expenses.forEach((e,i)=>{if(e.kind!=='inventory')return;const id=uuid(),entryId=uuid(),quantity=Number(e.factor)*Number(e.count)||1,unitCost=e.amount/quantity;receipts.push({id,document:'ФЕВ-2025-'+e.row,supplier:e.party,date:e.date,lines:[{materialId:materialMap.get(e.name).id,name:e.name,quantity,unitCost,historical:true,stockApplied:false}],total:e.amount,paid:true});receiptFinance.push({receiptId:id,basePaid:0});cash.push({id:entryId,direction:'out',kind:'trade',partyKey:'supplier:'+supplierMap.get(e.party).id,partyName:e.party,amount:e.amount,date:e.date,method:'unknown',outcomeId:outcomes[i].id,comment:'Историческая закупка. Счёт оплаты не указан.',actorId:admin.id,actorName:admin.name});allocations.push({entryId,documentType:'receipt',documentId:id,amount:e.amount});links.push({id:trace('receipt',e.key),data:{receiptId:id,outcomeId:outcomes[i].id,historical:true,stockApplied:false}});});
  await M.ReceiptDocument.bulkCreate(receipts,opts);await M.ReceiptFinance.bulkCreate(receiptFinance,opts);await M.CashEntry.bulkCreate(cash,opts);await M.CashAllocation.bulkCreate(allocations,opts);
  const reportGroups=new Map();for(const a of p.acts){const k=a.worker+':'+a.date;if(!reportGroups.has(k))reportGroups.set(k,{userId:workerMap.get(a.worker).id,date:a.date,total:0});reportGroups.get(k).total+=a.kg;}
  const reports=await L.Report.bulkCreate([...reportGroups.values()].map(r=>({userId:r.userId,total:r.total,createdAt:new Date(r.date+'T12:00:00+05:00')})),opts),reportMap=new Map([...reportGroups.keys()].map((k,i)=>[k,reports[i]]));
  const productions=p.acts.map(a=>({id:uuid(),productId:productMap.get(a.product).id,workerId:workerMap.get(a.worker).id,kg:a.kg,date:a.date,status:'posted',snapshot:{productName:productMap.get(a.product).name,kg:a.kg,recipeVersion:'история',historical:true,costComplete:false,source:a.source,ratePerKg:a.rate,lines:[],materialCost:null,laborCost:a.labor},materialCost:0,laborCost:a.labor,overheadCost:0,totalCost:a.labor,postedBy:admin.id,postedAt:new Date(a.date+'T12:00:00+05:00')}));
  await M.Production.bulkCreate(productions,opts);
  const items=await L.ReportProducts.bulkCreate(p.acts.map(a=>({reportId:reportMap.get(a.worker+':'+a.date).id,productId:productMap.get(a.product).id,measure:'kg',quantity:a.kg,price:a.rate,totalForSalary:a.labor,createdAt:new Date(a.date+'T12:00:00+05:00')})),opts);
  productions.forEach((a,i)=>links.push({id:'production:'+a.id,data:{reportId:items[i].reportId,reportProductId:items[i].id,source:p.acts[i].source}}));
  const salaryRows=await L.Salary.bulkCreate(p.workers.map(w=>({userId:workerMap.get(w.key).id,total_amount:round(p.acts.filter(a=>a.worker===w.key).reduce((s,a)=>s+a.labor,0)),advanced_amount:round(p.expenses.filter(e=>e.worker===w.key).reduce((s,e)=>s+e.amount,0)),date:new Date('2025-02-01T00:00:00+05:00'),is_active:true})),opts),salaryMap=new Map(p.workers.map((w,i)=>[w.key,salaryRows[i]]));
  const paid=p.expenses.map((e,i)=>({...e,outcomeId:outcomes[i].id})).filter(e=>e.worker),payments=await M.Payment.bulkCreate(paid.map(e=>({id:uuid(),workerId:workerMap.get(e.worker).id,amount:e.amount,date:e.date,note:'Из Excel · '+e.party})),opts);
  const advances=await L.Advance.bulkCreate(paid.map(e=>({salaryId:salaryMap.get(e.worker).id,amount:e.amount,payment_type:'История · '+e.party,createdAt:new Date(e.date+'T12:00:00+05:00')})),opts);
  await M.PaymentScope.bulkCreate(payments.map(x=>({paymentId:x.id,salaryMonth:'2025-02'})),opts);await M.PaymentPermission.bulkCreate(payments.map(x=>({paymentId:x.id,actorId:admin.id,reason:'Историческая выплата из источника'})),opts);
  await M.PayrollPaymentInfo.bulkCreate(payments.map((x,i)=>({paymentId:x.id,method:'unknown',outcomeId:paid[i].outcomeId,advanceIds:[advances[i].id],actorId:admin.id,actorName:admin.name,comment:'Счёт выплаты не указан в источнике'})),opts);
  payments.forEach((x,i)=>links.push({id:'payment:'+x.id,data:{advanceIds:[advances[i].id],source:paid[i].key}}));
  await M.LegacyLink.bulkCreate(links,opts);
  const summary={source:source.name,period:source.period,sheets:p.sheets,counts:{products:products.length,workers:workers.length,customers:customers.length,orders:orders.length,sales:incomes.length,expenses:outcomes.length,receipts:receipts.length,productions:productions.length,payments:payments.length},totals:{sales:source.totals.sale,expenses:source.totals.expense,unpaidSales:round(p.sales.filter(s=>!s.paid).reduce((n,s)=>n+s.total,0)),openingDebt:210000},reviews:p.reviews,stockVerified:false,accountsVerified:false};
  await State.create({key:marker,value:summary},opts);return summary;
 });
}
module.exports={importNative,marker};
