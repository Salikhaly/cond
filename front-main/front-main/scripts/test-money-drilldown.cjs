const assert=require('node:assert/strict');
const {moneyReport,reportState,paymentDocuments}=require('../src/operations/moneyReport');
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const ledger={accounts:[{id:'k',method:'kaspi'},{id:'c',method:'cash'}],rows:[
 {id:'one',date:'2026-11-01',sourceType:'cash',paymentPurpose:'out',amount:-500,category:'Поставщики',accountId:'k'},
 {id:'two',date:'2026-11-02',sourceType:'cash',paymentPurpose:'out',amount:-700,category:'Поставщики',accountId:'k'},
 {id:'cash',date:'2026-11-01',sourceType:'cash',paymentPurpose:'out',amount:-200,category:'Поставщики',accountId:'c'},
 {id:'in',date:'2026-11-01',sourceType:'cash',paymentPurpose:'in',amount:1000,category:'Клиенты',accountId:'k'},
 {id:'transfer',date:'2026-11-01',sourceType:'money',kind:'transfer',amount:200,accountId:'k'}]};
const state={...reportState({},'2026-11-06'),method:'kaspi',category:'Поставщики',view:'table',date:'2026-11-01',expandedId:'one'};
let r=moneyReport(ledger,state);
check(r.rows.length===1&&r.rows[0].id==='one','Day/category/method cell opens only its own payments');
check(r.metrics.outgoing===1200&&r.metrics.incoming===1000,'Period headline retains full selected-method totals and excludes transfers');
const restored=reportState(JSON.parse(JSON.stringify({kind:'money-period',...state})),'2026-11-07');
check(JSON.stringify(restored)===JSON.stringify(state),'Return restores period, method, table, day, category and expanded payment');
check(moneyReport(ledger,{...state,date:''}).rows.length===2,'Category total opens all its dates');
check(moneyReport(ledger,{...state,category:null,date:'',view:'all'}).rows.some(r=>r.id==='in'),'All payments includes client receipts');
check(moneyReport(ledger,{...state,date:'2026-11-03'}).rows.length===0,'Empty cell does not show another day');
const docs=paymentDocuments({allocations:[{documentType:'receipt',documentId:'r',amount:500},{documentType:'order',documentId:'o',amount:200},{documentType:'balance',documentId:'b',amount:100},{documentType:'receipt',documentId:'missing',amount:20}]},{receiptDocuments:[{id:'r',document:'ПО-12'}],orders:[{id:'o'}]});
check(docs[0].target.section==='materials'&&docs[0].target.action.id==='r'&&docs[0].amount===500,'Receipt allocation opens exact immutable source');
check(docs[1].target.section==='orders'&&docs[1].target.action.id==='o','Client allocation opens exact order');
check(docs[2].label==='Начальный долг'&&docs[2].target===null,'Opening balance does not invent an invoice');
check(docs[3].target===null,'Missing source is shown without a broken link or new-payment form');
check(paymentDocuments({},{}).length===0,'Old cached payment without allocations remains readable');
console.log(checks+' money drilldown checks passed');
