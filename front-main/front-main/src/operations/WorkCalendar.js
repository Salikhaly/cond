import React,{useMemo} from 'react';
import {calendarMetrics,attendanceLabel} from './workCalendarMetrics';
import {moneyFmt,today} from './api';

export default function WorkCalendar({data,person,month}){
    const m=useMemo(()=>calendarMetrics(data,person.id,month),[data,person.id,month]);
    const taken=Math.round(m.days.reduce((s,day)=>s+Number(day.paid||0),0)*100)/100;
    const difference=Math.round((Number(m.total||0)-taken)*100)/100;
    const available=Math.max(0,difference),overpaid=Math.max(0,-difference);
    const monthTitle=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
    return <section className="op-card">
        <div className="op-section-heading"><div><span className="op-eyebrow">ЗАРАБОТОК ЗА МЕСЯЦ</span><h2>Сколько заработал</h2><small className="op-muted">{monthTitle} · {m.worked} из {m.days.length} дней</small></div><span className={'op-badge '+(m.worked?'posted':'draft')}>{m.worked} раб. дней</span></div>
        <div className="op-pay-summary">
            <div className="op-pay-tile earned"><span>Заработал</span><strong>{moneyFmt(m.total)} ₸</strong><small>начислено за месяц</small></div>
            <div className="op-pay-tile taken"><span>Уже взял</span><strong>{moneyFmt(taken)} ₸</strong><small>выплаты и авансы</small></div>
            <div className={'op-pay-tile '+(overpaid>0?'over':'available')}><span>{overpaid>0?'Переплата':'Можно взять'}</span><strong>{moneyFmt(overpaid||available)} ₸</strong><small>{overpaid>0?'выплачено больше начисленного':'осталось из заработанного'}</small></div>
        </div>
        {overpaid>0&&<p className="op-plan-context">Начислено {moneyFmt(m.total)} ₸, выплачено {moneyFmt(taken)} ₸. Переплата уменьшит будущие начисления.</p>}
        {m.unallocated!==0&&<p className="op-plan-context">Прежние начисления {moneyFmt(m.unallocated)} ₸ без разбивки по дням.</p>}
        <div className="op-pay-graphic">
            <div className="op-pay-graphic-head"><h3>Рабочие дни</h3><small>по отметкам и документам</small></div>
            <div className="op-pay-graphic-grid" style={{gridTemplateColumns:'repeat('+m.days.length+', minmax(0, 1fr))'}}>
                {m.days.map(day=>{
                    const on=day.worked,label=attendanceLabel(day,data.presentationDate||today());
                    return <span key={day.date} className={'op-pay-graphic-day'+(on?' on':'')+(day.pending?' pending':'')} title={day.date+': '+label} aria-label={day.date+': '+label}/>;
                })}
            </div>
            <div className="op-pay-graphic-legend"><span><i className="green"/>Работал</span><span><i className="amber"/>На проверке</span><span><i/>Нет отметки</span></div>
        </div>
    </section>;
}
