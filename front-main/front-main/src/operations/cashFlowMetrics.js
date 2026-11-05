const {day}=require('./overviewMetrics');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function cashFlow(data,from='',to='',method=''){
    const within=d=>(!from||day(d)>=from)&&(!to||day(d)<=to),entries=data.cashEntries||[],linked=new Set(entries.map(e=>e.outcomeId).filter(Boolean).map(String));
    const cash=entries.filter(e=>['posted','reversed'].includes(e.status)&&e.kind!=='opening-credit'&&!entries.some(original=>original.id===e.reversalOf&&original.kind==='opening-credit')&&within(e.date)).map(e=>({id:'cash:'+e.id,date:e.date,name:e.kind==='reversal'?'Отмена ошибочной оплаты':e.direction==='in'?'Оплата клиента':'Оплата поставщику',party:e.partyName,received:e.direction==='in'?Number(e.amount):0,paid:e.direction==='out'?Number(e.amount):0,method:e.method,comment:e.comment,actorName:e.actorName}));
    const legacy=(data.outcomes||[]).filter(e=>!linked.has(String(e.id))&&within(e.date)).map(e=>({id:'legacy:'+e.id,date:e.date,name:e.name,party:e.recipient,received:Number(e.totalAmount)<0?-Number(e.totalAmount):0,paid:Math.max(0,Number(e.totalAmount)),method:(data.expenseMeta||[]).find(m=>String(m.outcomeId)===String(e.id))?.method||(data.payrollPaymentInfo||[]).find(p=>String(p.outcomeId)===String(e.id))?.method||'unknown',comment:(data.expenseMeta||[]).find(m=>String(m.outcomeId)===String(e.id))?.comment||'Прежний журнал расходов'}));
    const rows=[...cash,...legacy].filter(r=>!method||r.method===method).sort((a,b)=>String(b.date).localeCompare(String(a.date))),received=money(rows.reduce((s,r)=>s+r.received,0)),paid=money(rows.reduce((s,r)=>s+r.paid,0));
    return {rows,received,paid,net:money(received-paid),methods:Object.values(rows.reduce((m,r)=>{const x=m[r.method]||(m[r.method]={id:r.method,name:{cash:'Наличные',kaspi:'Kaspi',bank:'Другой',unknown:'Способ не указан'}[r.method]||r.method,received:0,paid:0});x.received=money(x.received+r.received);x.paid=money(x.paid+r.paid);return m;},{}))};
}
module.exports={cashFlow};
