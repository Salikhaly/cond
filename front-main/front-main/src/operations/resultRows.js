const {financialMetrics}=require('./financialMetrics'),{day}=require('./overviewMetrics');
const monthEnd=m=>{const d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return d.toISOString().slice(0,10);};
function resultRows(data,from,to,kind='sales',includeCounts=false){
 const f=financialMetrics(data,from,to,includeCounts),inside=date=>(!from||date>=from)&&(!to||date<=to);
 const sales=f.margin.rows.map(r=>({...r,id:'sale:'+r.id,title:(r.isReturn?'Возврат · ':'')+r.name,note:r.client,amount:r.revenue,source:r,complete:true,target:r.returnId?{section:'returns',action:{kind:'return-document',id:r.returnId}}:r.orderId?{section:'orders',action:{kind:'order',id:r.orderId}}:null}));
 const costs=sales.map(r=>({...r,id:'cost:'+r.id,amount:r.source.knownCost,complete:r.source.complete,unknownKg:r.source.unknownKg}));
 const operating=f.expenses.rows.filter(r=>r.kind==='operating').map(r=>({id:'expense:'+r.id,date:r.date,title:r.name,note:r.subcategory||r.category,amount:Number(r.totalAmount),complete:true,source:r,target:{section:'expenses',action:{kind:'document',id:r.id}}}));
 const payrollRow=(r,date,amount,label)=>({id:label+':'+r.id,date,title:label,note:(data.payees||data.workers||[]).find(p=>String(p.id)===String(r.userId))?.name||'Сотрудник',amount:Number(amount),complete:true,source:r,target:{section:'payroll',action:{kind:'work-day',userId:r.userId,date}}});
 for(const r of data.dailyPay||[])if(r.status==='posted'&&inside(r.date))operating.push(payrollRow(r,r.date,r.amount,'Дневное начисление'));
 for(const r of data.repAccruals||[])if(inside(monthEnd(r.month)))operating.push(payrollRow(r,monthEnd(r.month),r.delta,'Месячное начисление'));
 for(const r of data.wageAdjustments||[])if(inside(r.date))operating.push(payrollRow(r,r.date,r.amount,'Корректировка зарплаты'));
 for(const c of data.receiptCorrections||[])if(inside(c.date)&&Number(c.operatingDelta))operating.push({id:'receipt-correction:'+c.id,date:c.date,title:'Корректировка стоимости закупки',note:c.reason,amount:Number(c.operatingDelta),complete:true,source:c,target:{section:'materials',action:{kind:'receipt-correction',id:c.receiptId}}});
 let rows=kind==='sales'?sales:kind==='cost'?costs:kind==='operating'?operating:[...sales,...costs.map(r=>({...r,amount:-r.amount})),...operating.map(r=>({...r,amount:-r.amount}))];
 if(kind==='result'){
  for(const r of data.costEvents||[])if(r.kind==='return-scrap'&&inside(day(r.date)))rows.push({id:'scrap:'+r.id,date:day(r.date),title:'Списание возврата',note:'Потеря по себестоимости',amount:-Number(r.value),complete:Number(r.kg)-Number(r.knownKg)<.00011,source:r,target:r.returnId?{section:'returns',action:{kind:'return-document',id:r.returnId}}:null});
  if(includeCounts)for(const r of f.counts.docs)rows.push({id:'count:'+r.id,date:r.date,title:'Результат пересчёта',note:r.note||'Склад',amount:r.lines.reduce((sum,l)=>sum+Number(l.costDelta||0),0),complete:r.lines.every(l=>l.costComplete),source:r,target:{section:'inventory',action:{kind:'count-document',id:r.id}}});
 }
 return {financial:f,rows:rows.sort((a,b)=>b.date.localeCompare(a.date)||String(a.id).localeCompare(String(b.id)))};
}
module.exports={resultRows};
