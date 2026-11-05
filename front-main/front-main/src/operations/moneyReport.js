const {moneyMetrics}=require('./moneyMetrics');
const hidden=new Set(['opening','transfer','adjustment']);
function reportState(action={},day){return {from:action.from||day.slice(0,7)+'-01',to:action.to||day,method:action.method||'',category:action.category??null,view:['categories','table','all'].includes(action.view)?action.view:'categories',date:action.date||'',expandedId:action.expandedId||null};}
function moneyReport(ledger,state){
 const methodOf=r=>ledger.accounts.find(a=>a.id===r.accountId)?.method||'unknown';
 const payments=ledger.rows.filter(r=>!hidden.has(r.kind)&&!hidden.has(r.originKind)&&(!state.method||methodOf(r)===state.method));
 const metrics=moneyMetrics({...ledger,rows:payments},state.from,state.to);
 const selected=state.category===null?metrics.rows:metrics.categories.find(c=>c.name===state.category)?.rows||[];
 return {metrics,rows:selected.filter(r=>!state.date||r.date===state.date),methodOf};
}
function paymentDocuments(row,data){return (row.allocations||[]).map(a=>{
 const receipt=a.documentType==='receipt',order=a.documentType==='order';
 const doc=(receipt?data.receiptDocuments:order?data.orders:[])?.find(d=>d.id===a.documentId);
 return {...a,label:a.documentType==='balance'?'Начальный долг':(receipt?'Приход ':order?'Отгрузка ':'Документ ')+(doc?.document||String(a.documentId).slice(0,8).toUpperCase()),target:doc?(receipt?{section:'materials',action:{kind:'receipt-document',id:a.documentId}}:{section:'orders',action:{kind:'order',id:a.documentId}}):null};
});}
module.exports={reportState,moneyReport,paymentDocuments};
