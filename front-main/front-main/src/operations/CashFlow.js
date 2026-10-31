import React,{useState} from 'react';
import {cashFlow} from './cashFlowMetrics';
import {today,moneyFmt} from './api';
import {Field,Table,Empty} from './Fields';
import {Bars} from './ReportCharts';
export default function CashFlow({data}){
    const [from,setFrom]=useState(today().slice(0,7)+'-01'),[to,setTo]=useState(today()),[method,setMethod]=useState('');
    const m=cashFlow(data,from,to,method),rows=m.rows,labels={cash:'Наличные',kaspi:'Kaspi',bank:'Банковский перевод',unknown:'Способ не указан'};
    return <><section className="op-card"><h2>Движение денег</h2><div className="op-form-grid"><Field label="С даты" type="date" max={to} value={from} onChange={e=>setFrom(e.target.value)}/><Field label="По дату" type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/><Field label="Способ оплаты"><select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Все способы</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field></div>
    <div className="op-costs"><span>Получено <b>{moneyFmt(m.received)} ₸</b></span><span>Выплачено <b>{moneyFmt(m.paid)} ₸</b></span><strong>Изменение денег <b>{moneyFmt(m.net)} ₸</b></strong></div><p className="op-muted">Фактически записанные оплаты. Отгрузка сама по себе не считается получением денег. Это движение за период, а не прибыль или остаток в банке.</p></section>
    <section className="op-card"><h2>Изменение денег по способам оплаты</h2><Bars rows={m.methods.filter(r=>r.received||r.paid).map(r=>({id:r.id,name:r.name,amount:r.received-r.paid}))} value="amount" unit="₸"/></section>
    <section className="op-card"><h2>Платежи</h2>{!rows.length?<Empty>За выбранный период записанных платежей нет.</Empty>:<Table mobileCards headers={['Дата','Назначение','Контрагент','Получено','Выплачено','Способ / комментарий']}>{rows.map(r=><tr key={r.id}><td>{String(r.date).slice(0,10)}</td><td>{r.name}</td><td>{r.party}</td><td>{r.received?moneyFmt(r.received)+' ₸':'—'}</td><td>{r.paid?moneyFmt(r.paid)+' ₸':'—'}</td><td>{labels[r.method]}<small className="op-cell-detail">{r.comment} {r.actorName}</small></td></tr>)}</Table>}</section></>;
}
