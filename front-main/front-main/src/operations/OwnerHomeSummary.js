import React, { useMemo, useState } from 'react';
import { expenseMetrics } from './expenseMetrics';
import { moneyFmt, today } from './api';
import { Field, Empty } from './Fields';
import { shift } from './ownerMetrics';
import { Donut } from './ReportCharts';
import Icon from './Icon';

export default function OwnerHomeSummary({ data, onNavigate }) {
    const anchor = data.presentationDate || today();
    const [period, setPeriod] = useState('week');
    const [from, setFrom] = useState(shift(anchor, -6));
    const [to, setTo] = useState(anchor);
    const expenses = useMemo(() => expenseMetrics(data, from, to), [data, from, to]);
    const categories = expenses.categories.filter(row => Number(row.amount) > 0);
    const top = categories[0];
    const choose = value => {
        setPeriod(value);
        if (value === 'today') { setFrom(anchor); setTo(anchor); }
        if (value === 'week') { setFrom(shift(anchor, -6)); setTo(anchor); }
        if (value === 'month') { setFrom(anchor.slice(0, 7) + '-01'); setTo(anchor); }
    };
    return <section className="op-card op-infographic op-expenses-summary">
        <div className="op-section-heading"><div><span className="op-eyebrow">РАСХОДЫ</span><h2>{moneyFmt(expenses.total)} <small>₸</small></h2><p className="op-muted">За выбранный период</p></div><button className="ghost" onClick={() => onNavigate('expenses')}>Все <Icon name="forward" size={15} /></button></div>
        <div className="op-period-pills" role="group" aria-label="Период расходов">
            {[['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц'], ['custom', 'Даты']].map(([id, label]) => <button key={id} className={period === id ? 'active' : ''} aria-pressed={period === id} onClick={() => choose(id)}>{label}</button>)}
        </div>
        {period === 'custom' && <div className="op-form-grid"><Field label="С даты" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /><Field label="По дату" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></div>}
        {categories.length ? <Donut rows={categories} value="amount" unit="₸" label="Расходы по статьям" /> : <Empty>Расходов за период нет</Empty>}
        {top && <div className="op-infographic-foot"><span>Крупнейшая статья</span><b>{top.name}</b><strong>{moneyFmt(top.amount)} ₸</strong></div>}
    </section>;
}
