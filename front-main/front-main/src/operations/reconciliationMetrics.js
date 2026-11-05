const {day}=require('./overviewMetrics');
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function reconciliation({party,supplier=false,entries=[],returns=[],from='',to=''}){
 const all=[],sign=supplier?-1:1,labels={cash:'Наличные',kaspi:'Kaspi',bank:'Другой'};
 for(const doc of party.documents||[]){
  const date=day(doc.shippedAt||doc.date||doc.deliveryDate||doc.createdAt);
  all.push({date,document:doc.document||(doc.isOpening?'Ранее внесённый долг':'Накладная № '+String(doc.id).slice(0,8).toUpperCase()),debit:supplier?0:Number(doc.total),credit:supplier?Number(doc.originalTotal??doc.total):0});
  if(supplier)for(const c of doc.corrections||[])all.push({date:day(c.date),document:'Корректировка № '+c.id.slice(0,8).toUpperCase()+' · '+c.reason,debit:Number(c.totalDelta)<0?-Number(c.totalDelta):0,credit:Math.max(0,Number(c.totalDelta))});
  // Old fully/partly paid receipts have no separate payment entry. Their immutable basePaid is included once.
  if(supplier&&Number(doc.basePaid)>0)all.push({date,document:'Оплата при приходе · '+(doc.document||String(doc.id).slice(0,8)),debit:Number(doc.basePaid),credit:0});
 }
 for(const e of entries.filter(e=>e.partyKey===party.key&&['posted','reversed'].includes(e.status))){
  const debit=supplier?e.direction==='out':e.direction==='out';
  all.push({date:day(e.date),document:(e.kind==='reversal'?'Отмена оплаты':'Оплата')+' · '+(labels[e.method]||'Способ не указан')+(e.comment?' · '+e.comment:''),debit:debit?Number(e.amount):0,credit:debit?0:Number(e.amount)});
 }
 if(!supplier)for(const r of returns.filter(r=>r.status==='posted'))all.push({date:day(r.postedAt||r.createdAt),document:'Возврат № '+String(r.id).slice(0,8).toUpperCase(),debit:0,credit:Number(r.total)});
 all.sort((a,b)=>a.date.localeCompare(b.date));
 const opening=round(all.filter(r=>from&&r.date<from).reduce((s,r)=>s+sign*(r.debit-r.credit),0));
 let balance=opening;
 const rows=all.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)).map(r=>{balance=round(balance+sign*(r.debit-r.credit));return {...r,balance};});
 const debit=round(rows.reduce((s,r)=>s+r.debit,0)),credit=round(rows.reduce((s,r)=>s+r.credit,0));
 return {rows,opening,debit,credit,closing:balance};
}
module.exports={reconciliation};
