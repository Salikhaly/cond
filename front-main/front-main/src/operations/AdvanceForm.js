import React, { useEffect, useState } from 'react';
import { api, today, moneyFmt } from './api';
import { Field, Empty } from './Fields';
import AccountPicker from './AccountPicker';
import usePendingAction, { operationId } from './usePendingAction';
import { payrollMetrics } from './payrollMetrics';

export default function AdvanceForm({ data, run, busy, onBack }) {
    const people = data.payees || data.workers || [];
    const [form, setForm] = useState({ workerId: '', amount: '', date: today(), method: 'cash', accountId: '', note: '' });
    const [allowOver, setAllowOver] = useState(false);
    const [pending, setPending, stored] = usePendingAction('advance:new');
    const person = people.find(p => String(p.id) === String(form.workerId));
    const month = form.date ? form.date.slice(0, 7) : today().slice(0, 7);
    const metrics = person ? payrollMetrics(data, person.id, month) : null;
    const over = metrics && Number(form.amount) > Math.max(0, metrics.due) + 0.001;
    useEffect(() => {
        if (!form.workerId && people.length) setForm(f => ({ ...f, workerId: String(people[0].id) }));
    }, [people, form.workerId]);
    const change = (key, value) => { setAllowOver(false); setForm(f => ({ ...f, [key]: value })); };
    const body = () => ({ workerId: Number(form.workerId), amount: form.amount, date: form.date, method: form.method, accountId: form.accountId, note: form.note, salaryMonth: month, allowOverAdvance: !over || allowOver });
    const submit = () => run(async () => {
        const current = { ...pending, attempted: true };
        if (!setPending(current)) throw new Error('Не удалось сохранить подтверждение');
        try { await api('/advances', current.body, 'POST', current.id); }
        catch (e) { if (!e.network) setPending({ ...current, attempted: false }); throw e; }
        setPending(null);
        onBack();
    }, 'Аванс записан. Он учтён отдельно от зарплаты.');
    if (!people.length) return <section className="op-card"><button className="ghost" onClick={onBack}>← К расходам</button><Empty>Сначала добавьте работника в разделе «Команда и зарплата».</Empty></section>;
    if (pending) return <section className="op-card op-review-panel">
        <button className="ghost" disabled={pending.attempted} onClick={() => setPending(null)}>← Изменить</button>
        <h2>{pending.attempted ? 'Проверить запись аванса' : 'Записать аванс?'}</h2>
        <strong className="op-expense-amount">{moneyFmt(pending.body.amount)} ₸</strong>
        <p>{person?.name} · {pending.body.date} · {({ cash: 'Наличные', kaspi: 'Kaspi', bank: 'Банк' })[pending.body.method] || 'Счёт не указан'}</p>
        {pending.attempted && <p className="op-plan-context">Повторная проверка использует тот же номер операции. Второй аванс не создаётся.</p>}
        {!stored && <p className="op-missing">Не удалось сохранить подтверждение на устройстве. Освободите место и повторите.</p>}
        <button className="op-wide-action" disabled={busy || !stored} onClick={submit}>{pending.attempted ? 'Проверить и повторить' : 'Подтвердить аванс'}</button>
    </section>;
    return <section className="op-card op-quick-expense">
        <button className="ghost" onClick={onBack}>← К расходам</button>
        <h2>Аванс работнику</h2>
        <p className="op-muted">Выдача денег в счёт зарплаты. В отчёте по работнику аванс показывается отдельно от зарплаты.</p>
        <form onSubmit={e => { e.preventDefault(); setPending({ id: operationId(), body: body(), attempted: false }); }}>
            <Field label="Работник">
                <select value={form.workerId} onChange={e => change('workerId', e.target.value)} required>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.role === 'representative' ? ' · представитель' : ''}</option>)}
                </select>
            </Field>
            {person && metrics && <div className="op-costs"><span>Начислено <b>{moneyFmt(metrics.accrued)} ₸</b></span><span>Аванс <b>{moneyFmt(metrics.advancePaid)} ₸</b></span><strong>К выдаче <b>{moneyFmt(metrics.due)} ₸</b></strong></div>}
            <Field label="Сумма аванса, ₸" className="op-amount-input" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" required placeholder="0" value={form.amount} onChange={e => change('amount', e.target.value)} />
            <Field label="Дата выдачи" type="date" required value={form.date} onChange={e => change('date', e.target.value)} />
            <AccountPicker data={data} value={form.accountId} method={form.method} onChange={(accountId, method) => setForm(f => ({ ...f, accountId, method }))} />
            <details className="op-help"><summary>Комментарий</summary><Field label="Комментарий" maxLength={250} placeholder="Например: аванс на дорогу" value={form.note} onChange={e => change('note', e.target.value)} /></details>
            {over && <div className="op-missing"><label className="op-check"><input type="checkbox" checked={allowOver} onChange={e => setAllowOver(e.target.checked)} />Подтверждаю аванс сверх начисленного: {moneyFmt(Number(form.amount) - Math.max(0, metrics.due))} ₸. Он уменьшит будущую зарплату.</label></div>}
            <button className="op-wide-action" disabled={busy || !Number(form.amount) || (over && !allowOver)}>Проверить аванс</button>
        </form>
    </section>;
}
