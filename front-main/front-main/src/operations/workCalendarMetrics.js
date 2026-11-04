const {day}=require('./overviewMetrics'),{payrollMetrics}=require('./payrollMetrics');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const policyLabels={piece:'По изготовленным кг',shift:'Фиксированная смена',sales:'Процент от продаж',margin:'Процент от маржи',custom:'Ручные согласованные начисления',monthly:'Месячный оклад и процент',monthly_piece:'Оклад + выработка'};
function calendarMetrics(data,userId,month){
 userId=Number(userId);const isProduction=(data.workers||[]).some(w=>w.id===userId)||(data.payees||[]).some(w=>w.id===userId&&w.role==='employee');const [year,index]=month.split('-').map(Number),last=new Date(Date.UTC(year,index,0)).getUTCDate(),days=[];
 const policies=(data.workPolicies||[]).filter(p=>p.userId===userId).sort((a,b)=>b.startsOn.localeCompare(a.startsOn));
 const advances=(data.payrollAdvances||[]).filter(a=>(data.payroll||[]).some(s=>s.id===a.salaryId&&s.userId===userId));
 const paymentInfo=data.payrollPaymentInfo||[],mapped=new Set(paymentInfo.flatMap(i=>i.advanceIds||[]));
 const monthly=(data.repAccruals||[]).filter(a=>a.userId===userId&&a.month===month).reduce((s,a)=>s+Number(a.delta),0);
 for(let i=1;i<=last;i++){
  const date=month+'-'+String(i).padStart(2,'0'),productions=(data.productions||[]).filter(p=>p.workerId===userId&&p.status==='posted'&&p.date===date),work=(data.workDays||[]).find(w=>w.userId===userId&&w.date===date),daily=(data.dailyPay||[]).find(d=>d.userId===userId&&d.date===date),adjustments=(data.wageAdjustments||[]).filter(a=>a.userId===userId&&a.date===date);
  const piece=money(productions.reduce((s,p)=>s+Number(p.laborCost),0)),dayPay=Number(daily?.amount||0),correction=money(adjustments.reduce((s,a)=>s+Number(a.amount),0)),monthlyPart=i===last?money(monthly):0,earned=money(piece+dayPay+correction+monthlyPart);
  const payments=(data.payments||[]).filter(p=>p.workerId===userId&&p.date===date),legacyPaid=advances.filter(a=>day(a.createdAt)===date&&!mapped.has(a.id)),paid=money(payments.reduce((s,p)=>s+Number(p.amount),0)+legacyPaid.reduce((s,p)=>s+Number(p.amount),0));
  const requests=(data.wageRequests||[]).filter(r=>r.userId===userId&&r.date===date&&!['posted','approved','rejected','cancelled','superseded'].includes(r.status));
  const drafts=(data.productions||[]).filter(p=>p.workerId===userId&&p.date===date&&p.status==='draft'),worked=productions.length>0||!isProduction&&work?.status==='worked',pending=drafts.length>0||work?.status==='reported'||!!work?._pending||!!daily&&daily.status!=='posted'||requests.length>0;
  days.push({date,number:i,isProduction,drafts,worked,earned,piece,dayPay,correction,monthlyPart,paid,work,daily,productions,adjustments,requests,payments,legacyPaid,pending,off:work?.status==='off'&&!worked,hasEarnings:earned!==0,policy:policies.find(p=>p.startsOn<=date)||null});
 }
 const recorded=money(days.reduce((s,d)=>s+d.earned,0)),monthTotal=payrollMetrics(data,userId,month).accrued;
 return {days,recorded,monthly,unallocated:money(monthTotal-recorded),total:monthTotal,worked:days.filter(d=>d.worked).length,positive:days.filter(d=>d.earned>0).length,policies,offset:(new Date(Date.UTC(year,index-1,1)).getUTCDay()+6)%7};
}
function attendanceLabel(day,anchor){
 if(day.worked)return 'Работа подтверждена';
 if(day.pending)return 'На проверке';
 if(day.date>anchor)return 'День ещё не наступил';
 if(day.off)return 'Нерабочий день';
 if(day.hasEarnings)return 'Есть начисление, выход не подтверждён';
 return 'Нет отметки';
}
module.exports={calendarMetrics,policyLabels,attendanceLabel};
