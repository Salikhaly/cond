const monthOf = value => {
    if (!value) return '';
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return value.slice(0,7);
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)).slice(0,7);
};
function payrollTotals(salaries){
 const balances=new Map();for(const s of salaries||[])balances.set(s.userId,(balances.get(s.userId)||0)+Number(s.total_amount)-Number(s.advanced_amount));
 return {salaryDue:Math.round([...balances.values()].reduce((n,v)=>n+Math.max(0,v),0)*100)/100,advanceAhead:Math.round([...balances.values()].reduce((n,v)=>n+Math.max(0,-v),0)*100)/100};
}
function payrollMetrics(data, workerId, month) {
    const salaries=(data.payroll || []).filter(s=>(!workerId || s.userId===Number(workerId)) && (!month || monthOf(s.date)===month));
    const accrued=salaries.reduce((sum,s)=>sum+Number(s.total_amount),0),paid=salaries.reduce((sum,s)=>sum+Number(s.advanced_amount),0);
    const productions=(data.productions||[]).filter(p=>p.status==='posted'&&(!workerId||p.workerId===Number(workerId))&&(!month||monthOf(p.date)===month));
    const paymentMonth=p=>p.salaryMonth||monthOf(p.date);
    const payments=(data.payments||[]).filter(p=>(!workerId||p.workerId===Number(workerId))&&(!month||paymentMonth(p)===month));
    const advancePaid=payments.filter(p=>p.kind==='advance').reduce((sum,p)=>sum+Number(p.amount),0);
    const salaryPaid=payments.filter(p=>p.kind!=='advance').reduce((sum,p)=>sum+Number(p.amount),0);
    return {accrued,paid,advancePaid,salaryPaid,payments,advanceAhead:payrollTotals(salaries).advanceAhead,due:workerId?Math.round((accrued-paid)*100)/100:payrollTotals(salaries).salaryDue,kg:productions.reduce((sum,p)=>sum+Number(p.kg),0),advances:(data.payrollAdvances || []).filter(a=>salaries.some(s=>s.id===a.salaryId)).map(a=>({...a,workerId:salaries.find(s=>s.id===a.salaryId).userId,salaryMonth:monthOf(salaries.find(s=>s.id===a.salaryId).date)}))};
}
module.exports={monthOf,payrollMetrics,payrollTotals};
