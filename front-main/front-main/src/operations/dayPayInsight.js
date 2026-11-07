function dayPayInsight(data,person,day){
 const policy=day.policy||{mode:person.role==='representative'?'monthly':'piece'},mode=policy.mode;
 const posted=day.productions||[],drafts=day.drafts||[],kg=posted.reduce((s,p)=>s+Number(p.kg),0);
 let possible=null,possibleLabel='';
 if(['shift','shift_piece'].includes(mode)){possible=Number(day.work?.dailyAmount??policy.shiftRate);possibleLabel='За подтверждённую рабочую смену';}
 if(['sales','margin'].includes(mode)&&day.daily?.snapshot?.basis!=null){possible=Math.round((Number(day.daily.snapshot.basis)*Number(policy.percent)/100+Number(policy.fixedDay||0))*100)/100;possibleLabel='По фактической базе дня при подтверждённой работе';}
 const reasons=[];
 if(mode==='monthly_piece')reasons.push('Выработка начисляется по проведённым актам. Оклад за месяц проводится отдельно и добавляется один раз.');
 if(day.isProduction){if(posted.length)reasons.push('День подтверждён '+posted.length+' актами: '+kg.toLocaleString('ru-RU')+' кг.');else if(drafts.length)reasons.push('Акт отправлен, но ещё не проведён. Работа и начисление ждут проверки.');else if(day.off)reasons.push(day.work.comment||'День отмечен нерабочим.');else if(day.worked)reasons.push('Выход подтверждён в табеле.');else reasons.push('За эту дату нет проведённого акта. Работа не подтверждена.');}
 else if(day.work?.status==='reported')reasons.push('Отметка сотрудника ждёт проверки.');
 else if(day.off)reasons.push(day.work.comment||'День отмечен нерабочим.');
 if(['piece','monthly_piece','shift_piece'].includes(mode)&&posted.length)reasons.push('Выработка — по объёму и сохранённой ставке каждого акта.');
 if(['piece','monthly_piece','shift_piece'].includes(mode)&&posted.length&&Number(day.piece)===0)reasons.push('По акту сдельно начислено 0 ₸. Уточните ставку в условиях оплаты.');
 if(day.work?.dailyAmount!=null)reasons.push('Сумму за этот день подтвердил администратор.');
 if(['shift','shift_piece'].includes(mode)&&day.work?.dailyAmount==null)reasons.push(day.worked?'Оплачивается одна смена, даже если актов несколько.':'Без подтверждённой работы ставка смены не начисляется.');
 if(['sales','margin'].includes(mode))reasons.push('Процент '+Number(policy.percent)+'% от '+(mode==='sales'?'продаж':'маржи')+(Number(policy.fixedDay)>0?' + '+Number(policy.fixedDay).toLocaleString('ru-RU')+' ₸ за рабочий день.':'.'));
 if(['sales','margin'].includes(mode)&&!policy.attendanceRequired&&!day.worked&&Number(day.dayPay)>0)reasons.push('По согласованным условиям процент начисляется и без акта за эту дату.');
 if(day.daily&&day.daily.status!=='posted')reasons.push('Есть расчёт на проверке. Прежняя подтверждённая сумма сохранена.');
 if(day.correction)reasons.push('Согласованное изменение: '+(day.correction>0?'+':'')+day.correction.toLocaleString('ru-RU')+' ₸.');
 return {mode,policy,kg,possible,possibleLabel,reasons,unearned:possible==null?null:Math.max(0,Math.round((possible-Number(day.dayPay||0))*100)/100)};
}
function pieceForecast(product,policy,quantity){
 const personal=policy?.pieceRates?.find(r=>r.productId===product?.id),pack=Number(product?.packKg||0);
 if(!personal&&Number(policy?.boxRate)>0)return {unit:'коробок',rate:Number(policy.boxRate),amount:Math.round(Number(policy.boxRate)*Number(quantity||0)*100)/100};
 const raw=personal?Number(personal.rate)*(personal.unit==='pack'?1:pack||1):pack?(product?.payPerPack??product?.packLaborPerPack):(product?.payRateForKg??product?.priceForEmployee);
 if(raw==null||!Number.isFinite(Number(raw)))return null;return {unit:pack?'пачек':'кг',rate:Number(raw),amount:Math.round(Number(raw)*Number(quantity||0)*100)/100};
}
module.exports={dayPayInsight,pieceForecast};
