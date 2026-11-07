import React,{useMemo,useState,useRef,useEffect} from 'react';
import {calendarMetrics,attendanceLabel} from './workCalendarMetrics';
import {moneyFmt,fmt,today} from './api';
import {boxWord} from './boxWord';

export default function WorkCalendar({data,person,month,user,onNavigate,initialDate,onRequests,onMarkDay}){
 const m=useMemo(()=>calendarMetrics(data,person.id,month),[data,person.id,month]);
 const anchor=data.presentationDate||today(),detailRef=useRef(null);
 const [selected,setSelected]=useState(initialDate?.startsWith(month)?initialDate:anchor.startsWith(month)?anchor:m.days.find(d=>d.worked||d.pending)?.date||month+'-01');
 useEffect(()=>{if(initialDate?.startsWith(month))setSelected(initialDate);},[initialDate,month]);
 const day=m.days.find(d=>d.date===selected)||m.days[0];
 const admin=user?.role==='super_admin',canOutput=Boolean(onNavigate)&&data.permissions?.production!==false;
 const openDay=date=>{setSelected(date);detailRef.current?.scrollIntoView({block:'nearest'});};
 const productName=id=>[...(data.products||[]),...(data.archivedProducts||[])].find(p=>String(p.id)===String(id))?.name||'Товар';
 const monthTitle=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
 const dateTitle=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',weekday:'long',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'));
 return <section className="op-card ux-work-calendar">
  <div className="op-section-heading"><div><h2>Календарь работы</h2><small className="op-muted">{monthTitle} · рабочих дней: {m.worked}</small></div></div>
  <div className="ux-calendar-week" aria-hidden="true">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=><span key={d}>{d}</span>)}</div>
  <div className="ux-calendar-grid" aria-label="Дни месяца">{Array.from({length:m.offset},(_,i)=><span key={'empty'+i} aria-hidden="true"/>)}{m.days.map(d=><button key={d.date} type="button" aria-pressed={selected===d.date} aria-label={d.date+' · '+attendanceLabel(d,anchor)+(d.worked&&d.pending?' · есть акт на проверке':'')+' · начислено '+moneyFmt(d.earned)+' тенге'} className={(d.worked?'worked':d.pending?'pending':d.sick?'sick':d.off?'off':'neutral')+(selected===d.date?' selected':'')+(d.date===anchor?' today':'')} onClick={()=>openDay(d.date)}><b>{d.number}</b><small>{d.hasEarnings?new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1}).format(d.earned):d.pending?'Проверка':d.worked?'Акт':'—'}</small>{d.worked&&d.pending&&<i aria-label="Есть акт на проверке"/>}</button>)}</div>
  <div className="ux-calendar-legend"><span><i className="worked"/>Работал</span><span><i className="pending"/>На проверке</span><span><i/>Нет отметки</span></div>
  <div className="ux-calendar-day" ref={detailRef} aria-live="polite"><h3>{dateTitle}</h3><span className={'op-badge '+(day.worked?'posted':day.pending?'submitted':'')}>{attendanceLabel(day,anchor)}</span>
   {day.work?.comment&&<p className="op-muted">{day.work.comment}</p>}<div className="ux-day-totals"><span>Начислено за день <b>{moneyFmt(day.earned)} ₸</b></span>{day.paid>0&&<span>Выдано в этот день <b>{moneyFmt(day.paid)} ₸</b></span>}</div>
   {day.piece!==0&&<p className="op-muted">За проведённые выпуски: {moneyFmt(day.piece)} ₸</p>}{day.dayPay!==0&&<p className="op-muted">Дневной расчёт: {moneyFmt(day.dayPay)} ₸</p>}{day.monthlyPart!==0&&<p className="op-plan-context">Месячное начисление: {moneyFmt(day.monthlyPart)} ₸. Отнесено на конец месяца; это не отдельная смена.</p>}
   {[...day.productions,...day.drafts].map(p=><button disabled={!canOutput||p._pending} className="ux-day-document" key={p.id} onClick={()=>onNavigate?.('production',{kind:admin&&p.status==='draft'?'check-production':'production-document',id:p.id,returnDay:{userId:person.id,date:day.date}})}><span><b>{productName(p.productId)}</b><small>{p.boxes?fmt(p.boxes)+' '+boxWord(p.boxes)+' · ':''}{fmt(p.kg)} кг · {p._pending?'Ждёт отправки':p.status==='posted'?'Проведён':'На проверке'}</small></span><strong>{p.status==='posted'?moneyFmt(p.laborCost)+' ₸':admin?'Проверить →':'Открыть →'}</strong></button>)}
   {!day.productions.length&&!day.drafts.length&&<p className="op-muted">{day.date>anchor?'День ещё не наступил.':day.worked?'Выход подтверждён в табеле.':day.isProduction?'Нет акта выпуска. Это не отметка о прогуле.':'Нет документов работы за этот день.'}</p>}
   {day.adjustments.map((a,i)=><div className="ux-day-document" key={a.id||i}><span><b>{Number(a.amount)>=0?'Корректировка начисления':'Удержание'}</b><small>{a.reason||a.comment||'Согласованное изменение'}</small></span><strong>{moneyFmt(a.amount)} ₸</strong></div>)}
   {day.payments.map(p=><div className="ux-day-document" key={p.id}><span><b>{p.kind==='advance'?'Аванс':'Выплата'}</b><small>{p.salaryMonth?'За '+p.salaryMonth:'Месяц по распределению выплаты'}{p.note?' · '+p.note:''}</small></span><strong>{moneyFmt(p.amount)} ₸</strong></div>)}
   {day.legacyPaid.map(p=><div className="ux-day-document" key={p.id}><span>Прежняя выплата</span><strong>{moneyFmt(p.amount)} ₸</strong></div>)}
   {day.requests.length>0&&onRequests&&<button className="secondary" onClick={onRequests}>Запросы за день · {day.requests.length} →</button>}
   {onMarkDay&&day.date<=anchor&&(admin||day.date===anchor)&&<button onClick={()=>onMarkDay(day.date)}>Отметка и сумма за день</button>}
   {canOutput&&day.date<=anchor&&day.isProduction&&<button className="secondary" onClick={()=>onNavigate('production',{kind:'day-production',workerId:person.id,date:day.date,returnDay:{userId:person.id,date:day.date}})}>Записать фактический выпуск</button>}
  </div>
  {m.unallocated!==0&&<details className="op-help"><summary>Начисления без разбивки по дням · {moneyFmt(m.unallocated)} ₸</summary><p>Прежний месячный журнал содержит суммы без актов дня. Они входят в зарплату, но не обозначают подтверждённые рабочие дни.</p></details>}
 </section>;
}
