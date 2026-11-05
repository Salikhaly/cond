const db=require('../database/sequelize'),M=require('../models/operations');
const {Product,Outcome,OutcomeCategory}=require('../models/models');
const {Op}=require('sequelize');
const ApiError=require('../exceptions/ApiError');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const plain=r=>r.get?r.get({plain:true}):r;
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest('Только администратор');};
const text=(v,label,optional=false)=>{if(optional&&(v===undefined||v===null||v===''))return '';if(typeof v!=='string'||!v.trim()||v.length>1000)throw ApiError.badRequest('Укажите '+label);return v.trim();};
const amount=(v,label='сумму')=>{const n=Number(v);if(!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||n<=0||n>99999999.99||Math.abs(n*100-Math.round(n*100))>1e-6)throw ApiError.badRequest('Проверьте '+label+' (до двух знаков после запятой)');return money(n);};
const packSize=v=>{if(v===undefined||v===null||v==='')return null;const n=Number(v);if(!['string','number'].includes(typeof v)||!Number.isFinite(n)||n<=0||n>1000000||Math.abs(n*10000-Math.round(n*10000))>1e-6)throw ApiError.badRequest('Штук в коробке — положительное число');return n;};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw ApiError.badRequest('Укажите корректную дату');return v;};
const methods=['cash','kaspi','bank'];
function method(v){if(!methods.includes(v))throw ApiError.badRequest('Выберите способ оплаты');return v;}
function groupOrder(order,destination,customers){
    const c=customers.find(c=>c.id===destination?.customerId);
    if(!c)return {key:'legacy:'+order.company,name:order.company,customerId:null,outletId:null};
    return {key:c.debtScope==='outlet'?'outlet:'+destination.outletId:'customer:'+c.id,name:c.debtScope==='outlet'?destination.outletName:c.name,customerId:c.id,outletId:c.debtScope==='outlet'?destination.outletId:null};
}
async function readData(t){
    const read=async model=>(await model.findAll({transaction:t})).map(plain);
    const [orders,destinations,customers,receipts,suppliers,entries,allocations,receiptFinance,settlements,credits,returns,outlets,debts]=await Promise.all([M.Order,M.Destination,M.Customer,M.ReceiptDocument,M.Supplier,M.CashEntry,M.CashAllocation,M.ReceiptFinance,M.ReturnSettlement,M.CreditUse,M.GoodsReturn,M.Outlet,M.ClientDebt].map(read));
    return {orders,destinations,customers,receipts,suppliers,entries,allocations,receiptFinance,settlements,credits,returns,outlets,debts};
}
function documentPaid(d,type,id){
    const active=d.entries.filter(e=>['trade','opening-credit'].includes(e.kind)&&e.status==='posted').map(e=>e.id);
    const paid=d.allocations.filter(a=>a.documentType===type&&a.documentId===id&&active.includes(a.entryId)).reduce((s,a)=>s+Number(a.amount),0);
    if(type==='receipt'){
        const r=d.receipts.find(r=>r.id===id),meta=d.receiptFinance.find(f=>f.receiptId===id);
        return money(paid+(meta?Number(meta.basePaid):r?.paid?Number(r.total):0));
    }
    return money(paid);
}
function orderCredits(d,id){
    const debt=d.settlements.filter(s=>s.kind==='debt'&&d.returns.some(r=>r.id===s.returnId&&r.orderId===id&&r.status==='posted')).reduce((n,s)=>n+Number(s.amount),0);
    const credit=d.credits.filter(c=>c.orderId===id).reduce((n,c)=>n+Number(c.amount),0);
    return money(debt+credit);
}
function summarize(d,now=new Date()){
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const groups=new Map(),clientDocuments=[];
    for(const c of d.customers){const places=c.debtScope==='outlet'?(d.outlets||[]).filter(o=>o.customerId===c.id):[null];for(const o of places){const key=o?'outlet:'+o.id:'customer:'+c.id;groups.set(key,{key,name:o?.name||c.name,customerId:c.id,outletId:o?.id||null,sales:0,paid:0,adjustments:0,documents:[]});}}
    for(const o of d.orders.filter(o=>o.status==='shipped')){
        const destination=d.destinations.find(x=>x.orderId===o.id),g=groupOrder(o,destination,d.customers);
        if(!groups.has(g.key))groups.set(g.key,{...g,sales:0,paid:0,adjustments:0,documents:[]});
        const row={...o,partyKey:g.key,destination,paid:documentPaid(d,'order',o.id),adjustments:orderCredits(d,o.id)};
        row.due=money(Math.max(0,Number(o.total)-row.paid-row.adjustments));
        const group=groups.get(g.key);group.sales=money(group.sales+Number(o.total));group.adjustments=money(group.adjustments+row.adjustments);group.documents.push(row);clientDocuments.push(row);
    }
    for(const debt of (d.debts||[]).filter(d=>d.status!=='cancelled')){if(!groups.has(debt.partyKey))groups.set(debt.partyKey,{key:debt.partyKey,name:debt.partyName,sales:0,paid:0,adjustments:0,documents:[]});const g=groups.get(debt.partyKey);g.opening=money((g.opening||0)+Number(debt.total));g.documents.push({...debt,document:'Ранее внесённый долг',isOpening:true,paid:documentPaid(d,'balance',debt.id),due:money(Math.max(0,Number(debt.total)-documentPaid(d,'balance',debt.id)))});}
    for(const e of d.entries.filter(e=>['trade','opening-credit'].includes(e.kind)&&e.status==='posted'&&e.direction==='in')){
        if(!groups.has(e.partyKey))groups.set(e.partyKey,{key:e.partyKey,name:e.partyName,sales:0,adjustments:0,paid:0,documents:[]});
        const g=groups.get(e.partyKey);g.paid=money(g.paid+Number(e.amount));
    }
    const clients=[...groups.values()].map(g=>({...g,debt:money(Math.max(0,(g.opening||0)+g.sales-g.adjustments-g.paid)),advance:money(Math.max(0,g.paid+g.adjustments-g.sales-(g.opening||0)))}));
    const suppliers=d.suppliers.map(s=>{
        const documents=d.receipts.filter(r=>r.supplier===s.name).map(r=>({...r,paidAmount:documentPaid(d,'receipt',r.id)})).map(r=>({...r,debt:money(Math.max(0,Number(r.total)-r.paidAmount))}));
        const purchases=money(documents.reduce((n,r)=>n+Number(r.total),0)),paid=money(documents.reduce((n,r)=>n+r.paidAmount,0));
        return {...s,key:'supplier:'+s.id,documents,purchases,paid,debt:money(purchases-paid)};
    });
    clients.sort((a,b)=>b.debt-a.debt||a.name.localeCompare(b.name));suppliers.sort((a,b)=>b.debt-a.debt||a.name.localeCompare(b.name));
    return {clients,suppliers,clientDocuments,asOf:today,entries:d.entries,allocations:d.allocations};
}
async function ensureSuppliers(t){
    const receipts=await M.ReceiptDocument.findAll({attributes:['supplier'],group:['supplier'],order:[['supplier','ASC']],transaction:t});
    for(const r of receipts)await M.Supplier.findOrCreate({where:{name:r.supplier},transaction:t});
}
async function visible(user){
 admin(user);await ensureSuppliers();
 return db.transaction({isolationLevel:'REPEATABLE READ'},async t=>{
  const result=summarize(await readData(t)),terms=await M.OrderTerms.findAll({transaction:t});
  result.clients=result.clients.map(c=>({...c,documents:c.documents.map(o=>{const dueDate=terms.find(t=>t.orderId===o.id)?.dueDate;return {...o,dueDate:dueDate||null,overdue:Boolean(dueDate&&dueDate<result.asOf&&o.due>.001)};})}));
  return result;
 });
}
async function party(b,t){
    if(['supplier','customer'].includes(b.partyType)&&!uuid(b.partyId))throw ApiError.badRequest('Выберите контрагента');
    if(b.partyType==='supplier'){
        const s=await M.Supplier.findByPk(b.partyId,{transaction:t});if(!s)throw ApiError.badRequest('Поставщик не найден');return {key:'supplier:'+s.id,name:s.name,direction:'out',documentType:'receipt'};
    }
    if(b.partyType==='customer'){
        const c=await M.Customer.findByPk(b.partyId,{transaction:t});if(!c)throw ApiError.badRequest('Клиент не найден');
        if(c.debtScope==='outlet'){
            const o=await M.Outlet.findByPk(b.outletId,{transaction:t});if(!o||o.customerId!==c.id)throw ApiError.badRequest('Выберите магазин этого клиента');return {key:'outlet:'+o.id,name:o.name,direction:'in',documentType:'order'};
        }
        return {key:'customer:'+c.id,name:c.name,direction:'in',documentType:'order'};
    }
    if(b.partyType==='legacy'){
        const company=text(b.company,'фирму');if(!await M.Order.count({where:{company,status:'shipped'},transaction:t}))throw ApiError.badRequest('Фирма не найдена');return {key:'legacy:'+company,name:company,direction:'in',documentType:'order'};
    }
    throw ApiError.badRequest('Выберите клиента или поставщика');
}
async function lockParty(key,t){await db.query('SELECT pg_advisory_xact_lock(hashtext(:key))',{replacements:{key:'trade-money:'+key},transaction:t});}
async function allocation(entry,input,t){
    if(!Array.isArray(input)||input.length>100||input.some(a=>!uuid(a?.documentId)))throw ApiError.badRequest('Проверьте распределение платежа');
    const rows=input.map(a=>({documentId:a.documentId,amount:amount(a.amount)})).sort((a,b)=>String(a.documentId).localeCompare(String(b.documentId)));
    if(new Set(rows.map(r=>r.documentId)).size!==rows.length)throw ApiError.badRequest('Документ повторяется');
    const allocated=Number(await M.CashAllocation.sum('amount',{where:{entryId:entry.id},transaction:t})||0);
    if(money(allocated+rows.reduce((n,r)=>n+r.amount,0))>Number(entry.amount)+.001)throw ApiError.badRequest('Распределение превышает сумму платежа');
    const type=entry.direction==='out'?'receipt':'order',model=type==='receipt'?M.ReceiptDocument:M.Order,documents=new Map();
    for(const row of rows){
        const doc=await model.findByPk(row.documentId,{transaction:t,lock:t.LOCK.UPDATE})||(type==='order'?await M.ClientDebt.findByPk(row.documentId,{transaction:t,lock:t.LOCK.UPDATE}):null);
        if(!doc)throw ApiError.badRequest('Документ не найден');documents.set(doc.id,doc);
        if(type==='receipt')await M.ReceiptFinance.findOrCreate({where:{receiptId:doc.id},defaults:{basePaid:doc.paid?Number(doc.total):0},transaction:t});
    }
    const d=await readData(t);
    for(const row of rows){
        const doc=documents.get(row.documentId);
        if(type==='order'){
            if(doc.partyKey){if(doc.status==='cancelled')throw ApiError.badRequest('Начальный долг отменён');if(doc.partyKey!==entry.partyKey)throw ApiError.badRequest('Начальный долг другого клиента');}else if(doc.status!=='shipped')throw ApiError.badRequest('Оплата распределяется только на отгруженную заявку');
            const dest=d.destinations.find(x=>x.orderId===doc.id);if(!doc.partyKey&&groupOrder(doc,dest,d.customers).key!==entry.partyKey)throw ApiError.badRequest('Документ принадлежит другому клиенту или магазину');
        }else{
            const supplier=d.suppliers.find(s=>'supplier:'+s.id===entry.partyKey);if(!supplier||supplier.name!==doc.supplier)throw ApiError.badRequest('Приход другого поставщика');
        }
        const documentType=doc.partyKey?'balance':type,paid=documentPaid(d,documentType,doc.id),credit=type==='order'&&!doc.partyKey?orderCredits(d,doc.id):0;
        if(row.amount>money(Number(doc.total)-paid-credit)+.001)throw ApiError.badRequest('Сумма превышает остаток по документу');
        const existing=await M.CashAllocation.findOne({where:{entryId:entry.id,documentType,documentId:doc.id},transaction:t});
        if(existing)await existing.increment('amount',{by:row.amount,transaction:t});else await M.CashAllocation.create({entryId:entry.id,documentType,documentId:doc.id,amount:row.amount},{transaction:t});
        if(type==='receipt')await doc.update({paid:money(paid+row.amount)>=Number(doc.total)-.001},{transaction:t});
    }
}
async function payment(user,b,outer,legacy=false){admin(user);return db.transaction(outer?{transaction:outer}:{},async t=>{
    const p=await party(b,t);await lockParty(p.key,t);
    const value=amount(b.amount),rows=b.autoAllocate&&p.direction==='in'?oldest(value,summarize(await readData(t)).clients.find(c=>c.key===p.key)?.documents||[]):b.allocations||[];
    if(!Array.isArray(rows))throw ApiError.badRequest('Проверьте распределение платежа');
    if(p.direction==='out'&&money(rows.reduce((n,r)=>n+Number(r.amount),0))!==value)throw ApiError.badRequest('Распределите оплату поставщику по документам полностью');
    const entry=await M.CashEntry.create({partyKey:p.key,partyName:p.name,direction:p.direction,kind:'trade',amount:value,date:date(b.date),method:legacy&&b.method===undefined?'unknown':method(b.method),comment:text(b.comment,'комментарий',true),actorId:user.id,actorName:user.name},{transaction:t});
    await require('./moneyService').assign('cash:'+entry.id,{...b,method:entry.method},user,t);
    await allocation(entry,rows,t);
    if(p.direction==='out'){
        const [category]=await OutcomeCategory.findOrCreate({where:{name:'Закупка сырья и упаковки'},transaction:t});
        const out=await Outcome.create({recipient:p.name,name:'Оплата поставщику',unitPrice:value,quantity:1,totalAmount:value,outcomeCategoryId:category.id,date:entry.date},{transaction:t});
        await entry.update({outcomeId:out.id},{transaction:t});
    }
    return entry;
});}
async function allocate(user,id,b){admin(user);return db.transaction(async t=>{
    const initial=await M.CashEntry.findByPk(id,{transaction:t});if(initial)await lockParty(initial.partyKey,t);const e=await M.CashEntry.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!e||e.status!=='posted'||!['trade','opening-credit'].includes(e.kind))throw ApiError.badRequest('Платёж недоступен для распределения');await lockParty(e.partyKey,t);await allocation(e,b.allocations,t);return e;
});}
async function reverse(user,id,b){admin(user);const reason=text(b.reason,'причину отмены');return db.transaction(async t=>{
    const initial=await M.CashEntry.findByPk(id,{transaction:t});if(initial)await lockParty(initial.partyKey,t);const e=await M.CashEntry.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!e||e.status!=='posted'||!['trade','opening-credit'].includes(e.kind))throw ApiError.badRequest('Платёж уже отменён или не найден');await lockParty(e.partyKey,t);
    if(e.kind==='opening-credit')await require('./authorityService').owner(user);
    const reversed=await M.CashEntry.create({direction:e.direction==='in'?'out':'in',kind:'reversal',partyKey:e.partyKey,partyName:e.partyName,amount:e.amount,date:date(b.date),method:e.method,comment:reason,actorId:user.id,actorName:user.name,reversalOf:e.id},{transaction:t});
    if(e.kind!=='opening-credit'&&!await require('./moneyService').copyAssignment('cash:'+e.id,'cash:'+reversed.id,user,t))await require('./moneyService').assign('cash:'+reversed.id,{method:e.method},user,t);
    await e.update({status:'reversed'},{transaction:t});
    if(e.outcomeId){const original=await Outcome.findByPk(e.outcomeId,{transaction:t});const out=await Outcome.create({recipient:e.partyName,name:'Отмена оплаты: '+reason.slice(0,150),unitPrice:-Number(e.amount),quantity:1,totalAmount:-Number(e.amount),outcomeCategoryId:original.outcomeCategoryId,date:reversed.date},{transaction:t});await reversed.update({outcomeId:out.id},{transaction:t});}
    const d=await readData(t);for(const a of d.allocations.filter(a=>a.entryId===id&&a.documentType==='receipt')){const doc=await M.ReceiptDocument.findByPk(a.documentId,{transaction:t,lock:t.LOCK.UPDATE});await doc.update({paid:documentPaid(d,'receipt',doc.id)>=Number(doc.total)-.001},{transaction:t});}
    return reversed;
});}
async function payReceipt(user,id,b){admin(user);return db.transaction(async t=>{
    const r=await M.ReceiptDocument.findByPk(id,{transaction:t});if(!r)throw ApiError.notFound('Приход не найден');
    const [s]=await M.Supplier.findOrCreate({where:{name:r.supplier},transaction:t});
    await lockParty('supplier:'+s.id,t);const d=await readData(t),due=money(Number(r.total)-documentPaid(d,'receipt',r.id));
    if(due<=.001)throw ApiError.badRequest('Этот приход уже оплачен');
    await payment(user,{partyType:'supplier',partyId:s.id,amount:b.amount??due,date:b.date,method:b.method,accountId:b.accountId,comment:b.comment||'Оплата прихода '+r.document,allocations:[{documentId:id,amount:b.amount??due}]},t,true);
    return M.ReceiptDocument.findByPk(id,{transaction:t});
});}
async function supplier(user,b){admin(user);return M.Supplier.create({name:text(b.name,'название поставщика'),contact:text(b.contact,'контакт',true),phone:text(b.phone,'телефон',true),comment:text(b.comment,'комментарий',true),defaultUnitsPerPack:packSize(b.defaultUnitsPerPack)});}
async function editSupplier(user,id,b){admin(user);return db.transaction(async t=>{const s=await M.Supplier.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!s)throw ApiError.notFound('Поставщик не найден');const name=b.name===undefined?s.name:text(b.name,'название');if(name!==s.name&&await M.ReceiptDocument.count({where:{supplier:s.name},transaction:t}))throw ApiError.badRequest('Название поставщика с историей закупок сохраняется. Можно изменить контакты и комментарий');return s.update({name,contact:text(b.contact,'контакт',true),phone:text(b.phone,'телефон',true),comment:text(b.comment,'комментарий',true),defaultUnitsPerPack:b.defaultUnitsPerPack===undefined?s.defaultUnitsPerPack:packSize(b.defaultUnitsPerPack)},{transaction:t});});}
async function prices(user){admin(user);return M.ClientPrice.findAll({order:[['startsOn','DESC'],['createdAt','DESC'],['revision','DESC']]});}
async function price(user,b){admin(user);return db.transaction(async t=>{
    const c=await M.Customer.findByPk(b.customerId,{transaction:t}),p=await Product.findByPk(b.productId,{transaction:t});if(!c||!p)throw ApiError.badRequest('Выберите клиента и товар');
    if(b.outletId){const o=await M.Outlet.findByPk(b.outletId,{transaction:t});if(!o||o.customerId!==c.id)throw ApiError.badRequest('Магазин другого клиента');}
    if(!['number','string'].includes(typeof b.price)||String(b.price).trim()==='')throw ApiError.badRequest('Укажите цену');
    const value=Number(b.price);if(value!==0)amount(b.price,'цену');else if(b.price===''||b.price===null||b.price===undefined)throw ApiError.badRequest('Укажите цену');
    return M.ClientPrice.create({customerId:c.id,outletId:b.outletId||null,productId:p.id,price:value,startsOn:date(b.startsOn),actorId:user.id,actorName:user.name},{transaction:t});
});}
async function pricingRules(customerId,productId,onDate,t){return M.ClientPrice.findAll({where:{customerId,productId,startsOn:{[Op.lte]:onDate}},raw:true,transaction:t});}
async function quote(customerId,outletId,productId,onDate,t){
 const rules=await pricingRules(customerId,productId,onDate,t),standard=await M.SellingPrice.findByPk(productId,{transaction:t});
 return require('../domain/catalogPrice').rateForKg({rules,customerId,outletId,productId,onDate,standardPrice:standard?.price});
}
async function quotePack(customerId,outletId,pack,onDate,t){
 const rules=await pricingRules(customerId,pack.productId,onDate,t),standard=await M.SellingPrice.findByPk(pack.productId,{transaction:t});
 return require('../domain/catalogPrice').priceForPack({rules,customerId,outletId,productId:pack.productId,pack,onDate,standardPrice:standard?.price});
}
async function terms(user,id,b){admin(user);if(!await M.Order.findByPk(id))throw ApiError.notFound('Заявка не найдена');return M.OrderTerms.upsert({orderId:id,dueDate:b.dueDate?date(b.dueDate):null});}
function extras(d){
 const result=summarize(d),receiptPaidAmounts=Object.fromEntries(d.receipts.map(r=>[r.id,documentPaid(d,'receipt',r.id)]));
 return {cashEntries:d.entries,receiptPaidAmounts,supplierDefaults:(d.suppliers||[]).map(s=>({id:s.id,name:s.name,defaultUnitsPerPack:s.defaultUnitsPerPack??null})),tradeTotals:{customerDebt:money(result.clients.reduce((s,c)=>s+c.debt,0)),customerAdvance:money(result.clients.reduce((s,c)=>s+c.advance,0)),supplierDebt:money(d.receipts.reduce((s,r)=>s+Math.max(0,Number(r.total)-receiptPaidAmounts[r.id]),0))}};
}
async function availableForOrder(id,t){const d=await readData(t),o=d.orders.find(o=>o.id===id);if(!o)throw ApiError.notFound('Накладная не найдена');return money(Math.max(0,Number(o.total)-documentPaid(d,'order',id)-orderCredits(d,id)));}
function oldest(value,documents){let left=Math.round(Number(value)*100);return [...documents].filter(d=>Number(d.due)>0).sort((a,b)=>String(a.date||a.deliveryDate||'').localeCompare(String(b.date||b.deliveryDate||''))||a.id.localeCompare(b.id)).flatMap(d=>{const cents=Math.min(left,Math.round(d.due*100));left-=cents;return cents>0?[{documentId:d.id,amount:cents/100}]:[];});}
async function lockOrderParty(id,t){const order=await M.Order.findByPk(id,{transaction:t});if(!order)return;const destination=await M.Destination.findByPk(id,{transaction:t}),customer=destination?await M.Customer.findByPk(destination.customerId,{transaction:t}):null;await lockParty(groupOrder(order,destination,customer?[customer]:[]).key,t);}
async function applyAdvance(order,t){const d=await readData(t),destination=d.destinations.find(x=>x.orderId===order.id);return applyForParty(groupOrder(order,destination,d.customers).key,t);}
async function applyForParty(key,t){const d=await readData(t);for(const entry of d.entries.filter(e=>e.partyKey===key&&e.direction==='in'&&['trade','opening-credit'].includes(e.kind)&&e.status==='posted').sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){const current=await readData(t),left=money(Number(entry.amount)-current.allocations.filter(a=>a.entryId===entry.id).reduce((n,a)=>n+Number(a.amount),0)),party=summarize(current).clients.find(c=>c.key===key);if(left>.001){const rows=oldest(left,party?.documents||[]);if(rows.length)await allocation(entry,rows,t);}}}
async function opening(user,b){await require('./authorityService').owner(user);return db.transaction(async t=>{const p=await party(b,t);if(p.direction!=='in')throw ApiError.badRequest('Выберите клиента');await lockParty(p.key,t);const value=amount(b.amount),reason=text(b.reason,'причину');if(b.kind==='credit'){const row=await M.CashEntry.create({kind:'opening-credit',direction:'in',partyKey:p.key,partyName:p.name,amount:value,date:date(b.date),method:'unknown',comment:reason,actorId:user.id,actorName:user.name},{transaction:t});const docs=summarize(await readData(t)).clients.find(c=>c.key===p.key)?.documents||[];await allocation(row,oldest(value,docs),t);return row;}if(b.kind!=='debt')throw ApiError.badRequest('Выберите долг или аванс');const debt=await M.ClientDebt.create({partyKey:p.key,partyName:p.name,total:value,date:date(b.date),reason,actorId:user.id,actorName:user.name},{transaction:t});await applyForParty(p.key,t);return debt;});}
async function cancelOpening(user,id,b){await require('./authorityService').owner(user);return db.transaction(async t=>{const first=await M.ClientDebt.findByPk(id,{transaction:t});if(!first)throw ApiError.notFound('Долг не найден');await lockParty(first.partyKey,t);const debt=await M.ClientDebt.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(debt.status==='cancelled')throw ApiError.badRequest('Долг уже отменён');await M.CashAllocation.destroy({where:{documentType:'balance',documentId:id},transaction:t});await debt.update({status:'cancelled',cancelReason:text(b.reason,'причину отмены')},{transaction:t});await applyForParty(debt.partyKey,t);return debt;});}
module.exports={cancelOpening,opening,oldest,lockOrderParty,applyAdvance,editSupplier,extras,availableForOrder,visible,payment,allocate,reverse,payReceipt,supplier,prices,price,quote,quotePack,terms,ensureSuppliers,readData,summarize,documentPaid,orderCredits};
