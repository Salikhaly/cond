const {marginMetrics}=require('./marginMetrics'),{expenseMetrics}=require('./expenseMetrics'),{stockCountMetrics}=require('./stockCountMetrics'),{day}=require('./overviewMetrics');
const monthEnd=month=>{const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return d.toISOString().slice(0,10);};
function financialMetrics(data,from='',to='',includeCounts=false){
 const margin=marginMetrics(data,from,to),expenses=expenseMetrics(data,from,to),counts=stockCountMetrics(data,from,to),within=v=>(!from||day(v)>=from)&&(!to||day(v)<=to);
 // Monthly agreements are recognized on the last day of their salary month, never on payout.
 const monthly=(data.repAccruals||[]).filter(a=>within(monthEnd(a.month))),daily=(data.dailyPay||[]).filter(a=>within(a.date));
 const payrollOperating=monthly.reduce((s,a)=>s+Number(a.delta),0)+daily.filter(a=>a.status==='posted').reduce((s,a)=>s+Number(a.amount),0),payrollPending=daily.filter(a=>a.status!=='posted');
 const adjustments=(data.wageAdjustments||[]).filter(a=>within(a.date)).reduce((s,a)=>s+Number(a.amount),0);
 const receiptVariance=(data.receiptCorrections||[]).filter(c=>within(c.date)).reduce((s,c)=>s+Number(c.operatingDelta),0);
 const operating=expenses.operating+payrollOperating+adjustments+receiptVariance;
 const capitalizedOverhead=(data.productions||[]).filter(p=>p.status==='posted'&&within(p.date)).reduce((s,p)=>s+Number(p.overheadCost||0),0);
 const overheadReview=capitalizedOverhead>0&&Math.abs(expenses.operating)>.001;
 const payrollUnallocated=(data.payrollUnallocated||[]).filter(r=>(!from||monthEnd(r.month)>=from)&&(!to||r.month+'-01'<=to));
 const complete=margin.complete&&margin.scrapComplete&&expenses.complete&&!overheadReview&&!payrollPending.length&&!payrollUnallocated.length&&(!includeCounts||counts.complete);
 return {receiptVariance,capitalizedOverhead,overheadReview,personal:expenses.personal,margin,expenses,counts,payrollOperating,payrollPending,payrollUnallocated,operating,complete,profit:complete?margin.margin-margin.scrapCost-operating+(includeCounts?counts.cost:0):null,includeCounts};
}
module.exports={financialMetrics};
