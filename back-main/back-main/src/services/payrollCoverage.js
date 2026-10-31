const D=require('./businessDay');
module.exports=data=>{
 const totals=new Map(),known=new Map(),add=(map,month,amount)=>map.set(month,(map.get(month)||0)+Number(amount||0));
 for(const s of data.payroll||[])add(totals,D.day(s.date).slice(0,7),s.total_amount);
 for(const p of data.productions||[])if(p.status==='posted')add(known,p.date.slice(0,7),p.laborCost);
 for(const d of data.dailyPay||[])add(known,d.date.slice(0,7),d.amount);
 for(const a of data.wageAdjustments||[])add(known,a.date.slice(0,7),a.amount);
 for(const a of data.repAccruals||[])add(known,a.month,a.delta);
 return [...new Set([...totals.keys(),...known.keys()])].map(month=>({month,amount:Math.round(((totals.get(month)||0)-(known.get(month)||0))*100)/100})).filter(r=>Math.abs(r.amount)>.011);
};
