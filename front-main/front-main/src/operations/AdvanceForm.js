import React, { useState } from 'react';
import { api, today, moneyFmt } from './api';
import { Field, Empty } from './Fields';
import AccountPicker from './AccountPicker';
import useRecordedAction from './useRecordedAction';
import {PendingRecord,RecordedResult} from './RecordStatus';
import { payrollMetrics } from './payrollMetrics';

export default function AdvanceForm({ data, run, busy, onBack, initialWorkerId, onOpen }) {
    const people = data.payees || data.workers || [];
    const [form, setForm] = useState({ workerId: initialWorkerId?String(initialWorkerId):'', amount: '', date: today(), method: 'cash', accountId: '', note: '' });
    const [allowOver, setAllowOver] = useState(false);
    const [done,setDone]=useState(null),[search,setSearch]=useState('');
    const record=useRecordedAction({name:'advance:new',path:'/advances',data,run,message:'Аванс записан',onSaved:(result,body)=>{setDone({result,body});setForm(f=>({...f,amount:'',note:''}));setAllowOver(false);}});
    const person = people.find(p => String(p.id) === String(form.workerId));
    const month = form.date ? form.date.slice(0, 7) : today().slice(0, 7);
    const metrics = person ? payrollMetrics(data, person.id, month) : null;
    const over = metrics && Number(form.amount) > Math.max(0, metrics.due) + 0.001;
    const change = (key, value) => { setAllowOver(false); setForm(f => ({ ...f, [key]: value })); };
    const body = () => ({ workerId: Number(form.workerId), amount: form.amount, date: form.date, method: form.method, accountId: form.accountId, kind:'advance', note: form.note, salaryMonth: month, allowOverAdvance: allowOver });
    if (!people.length) return <section className="op-card"><button className="ghost" onClick={onBack}>← К расходам</button><Empty>Сначала добавьте работника в разделе «Команда и зарплата».</Empty></section>;
    if(record.pending)return <PendingRecord operation={record.pending} title={people.find(p=>String(p.id)===String(record.pending.body.workerId))?.name||'Аванс'} busy={busy} stored={record.stored} onRetry={record.retry}/>;
    if(done)return <RecordedResult title={'Аванс · '+(people.find(p=>String(p.id)===String(done.body.workerId))?.name||'Сотрудник')} amount={done.body.amount} onOpen={onOpen?()=>onOpen(done.body.workerId):null} onAnother={()=>setDone(null)} onBack={onBack}/>;
    return <section className="op-card op-quick-expense">
        <button className="ghost" onClick={onBack}>← К расходам</button>
        <h2>Аванс работнику</h2>
        <p className="op-muted">Работнику или торговому представителю.</p>
        <form onSubmit={e => { e.preventDefault(); if(person&&(!over||allowOver))record.save(body()); }}>
            <Field label="Найти сотрудника" type="search" value={search} placeholder="Имя или должность" onChange={e=>setSearch(e.target.value)}/>
            <Field label="Сотрудник">
                <select value={form.workerId} onChange={e => change('workerId', e.target.value)} required>
                    <option value="">Выберите сотрудника</option>{people.filter(p=>String(p.id)===form.workerId||p.name.toLowerCase().includes(search.toLowerCase())).map(p => <option key={p.id} value={p.id}>{p.name}{p.role === 'representative' ? ' · представитель' : ''}</option>)}
                </select>
            </Field>
            {person && metrics && <div className="op-costs"><span>Начислено <b>{moneyFmt(metrics.accrued)} ₸</b></span><span>Аванс <b>{moneyFmt(metrics.advancePaid)} ₸</b></span><strong>К выдаче <b>{moneyFmt(metrics.due)} ₸</b></strong></div>}
            <Field label="Сумма аванса, ₸" className="op-amount-input" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" required placeholder="0" value={form.amount} onChange={e => change('amount', e.target.value)} />

            <AccountPicker data={data} value={form.accountId} method={form.method} onChange={(accountId, method) => setForm(f => ({ ...f, accountId, method }))} />
            <details className="op-help"><summary>Дата и комментарий</summary><Field label="Дата выдачи" type="date" required value={form.date} onChange={e=>change('date',e.target.value)}/><Field label="Комментарий" maxLength={250} placeholder="Например: аванс на дорогу" value={form.note} onChange={e => change('note', e.target.value)} /></details>
            {over && <div className="op-missing"><label className="op-check"><input type="checkbox" checked={allowOver} onChange={e => setAllowOver(e.target.checked)} />Подтверждаю аванс сверх начисленного: {moneyFmt(Number(form.amount) - Math.max(0, metrics.due))} ₸. Он уменьшит будущую зарплату.</label></div>}
            <button className="op-wide-action" disabled={busy || !person || !Number(form.amount) || (over && !allowOver)}>Записать аванс{Number(form.amount)>0?' · '+moneyFmt(form.amount)+' ₸':''}</button>
        </form>
    </section>;
}
