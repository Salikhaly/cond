const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function receiptTotal(data,doc){return money(Number(doc.total)+(data.corrections||[]).filter(c=>c.receiptId===doc.id).reduce((s,c)=>s+Number(c.totalDelta),0));}
function rawPaid(data,doc){const active=new Set(data.entries.filter(e=>['trade','opening-credit'].includes(e.kind)&&e.status==='posted').map(e=>e.id));const allocated=data.allocations.filter(a=>a.documentType==='receipt'&&a.documentId===doc.id&&active.has(a.entryId)).reduce((s,a)=>s+Number(a.amount),0),meta=data.receiptFinance.find(f=>f.receiptId===doc.id);const refundIds=new Set(data.entries.filter(e=>e.kind==='supplier-refund'&&e.status==='posted').map(e=>e.id)),refunded=data.allocations.filter(a=>a.documentType==='receipt'&&a.documentId===doc.id&&refundIds.has(a.entryId)).reduce((s,a)=>s+Number(a.amount),0);return money(allocated+Number(meta?.basePaid??(doc.paid?doc.total:0))-refunded);}
function supplierProjection(data,name){
 const docs=data.receipts.filter(d=>d.supplier===name).map(d=>({id:d.id,date:d.date,total:receiptTotal(data,d),rawPaid:rawPaid(data,d)}));
 let credit=money(docs.reduce((s,d)=>s+Math.max(0,d.rawPaid-d.total),0));
 const result={};for(const d of [...docs].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){const direct=Math.min(d.rawPaid,d.total),advance=Math.min(credit,Math.max(0,d.total-direct));credit=money(credit-advance);result[d.id]={paid:money(direct+advance),advanceApplied:advance};}
 return result;
}
module.exports={receiptTotal,rawPaid,supplierProjection};
