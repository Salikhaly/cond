import React, { useMemo, useState } from 'react';
import { fmt, moneyFmt, today } from './api';
import './print.css';

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const dateText = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('ru-RU') : '';
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const amountWords = value => {
    const n = Math.round(Number(value) || 0);
    return n ? n.toLocaleString('ru-RU') + ' тенге' : 'ноль тенге';
};

function ActTable({ title, rows, opening, debit, credit, closing }) {
    return <div className="op-act-side"><h4>{title}</h4><table><thead><tr><th>Дата</th><th>Документ</th><th>Дебет</th><th>Кредит</th></tr></thead><tbody>
        <tr className="op-act-opening"><td colSpan="2">Сальдо на начало</td><td>{moneyFmt(opening.debit)}</td><td>{moneyFmt(opening.credit)}</td></tr>
        {rows.map((row, index) => <tr key={index}><td>{dateText(row.date)}</td><td>{row.document}</td><td>{row.debit ? moneyFmt(row.debit) : ''}</td><td>{row.credit ? moneyFmt(row.credit) : ''}</td></tr>)}
        <tr className="op-act-turnover"><td colSpan="2">Обороты за период</td><td>{moneyFmt(debit)}</td><td>{moneyFmt(credit)}</td></tr>
        <tr className="op-act-closing"><td colSpan="2">Сальдо на конец</td><td>{moneyFmt(closing.debit)}</td><td>{moneyFmt(closing.credit)}</td></tr>
    </tbody></table></div>;
}

export function ReconciliationAct({ party, supplier = false, entries: ledgerEntries = [], company = 'COND', onClose }) {
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(today());
    const data = useMemo(() => {
        const docs = (party?.documents || []).filter(doc => !doc.isOpening && (!doc.date || (doc.date >= from && doc.date <= to)));
        const entries = (ledgerEntries.length ? ledgerEntries : party?.entries || []).filter(entry => entry.partyKey === party?.key && entry.status === 'posted' && entry.date >= from && entry.date <= to);
        const rows = [];
        for (const doc of docs) rows.push({ date: doc.date || doc.deliveryDate, document: doc.document || 'Накладная № ' + String(doc.id).slice(0, 8).toUpperCase(), debit: supplier ? 0 : money(doc.total), credit: supplier ? money(doc.total) : 0 });
        for (const entry of entries) rows.push({ date: entry.date, document: (entry.method ? 'Оплата · ' + entry.method : 'Оплата') + (entry.comment ? ' · ' + entry.comment : ''), debit: supplier ? money(entry.amount) : 0, credit: supplier ? 0 : money(entry.amount) });
        rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
        const opening = supplier ? Number(party?.opening || 0) : Number(party?.opening || 0);
        const debit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
        const credit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
        const closing = supplier ? Math.max(0, opening + credit - debit) : Math.max(0, opening + debit - credit);
        return { rows, opening, debit, credit, closing };
    }, [party, supplier, from, to]);
    const ours = company;
    return <section className="op-act-document">
        <div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={onClose}>Назад</button></div>
        <div className="op-act-toolbar op-no-print"><label>Период с <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>по <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><span>1 лист A4</span></div>
        <h2 className="op-act-title">Акт сверки № {String(party?.key || party?.id || '').split(':').pop().slice(0, 10).toUpperCase()} от {dateText(to)} г.</h2>
        <p className="op-act-subtitle">взаимных расчётов за период с {dateText(from)} по {dateText(to)} между <b>{party?.name}</b> и <b>{ours}</b></p>
        <div className="op-act-grid">
            <ActTable title={'По данным ' + (party?.name || '')} rows={data.rows.map(row => ({ ...row }))} opening={{ debit: supplier ? 0 : data.opening, credit: supplier ? data.opening : 0 }} debit={data.debit} credit={data.credit} closing={{ debit: supplier ? 0 : data.closing, credit: supplier ? data.closing : 0 }} />
            <ActTable title={'По данным ' + ours} rows={data.rows.map(row => ({ ...row, debit: row.credit, credit: row.debit }))} opening={{ debit: supplier ? data.opening : 0, credit: supplier ? 0 : data.opening }} debit={data.credit} credit={data.debit} closing={{ debit: supplier ? data.closing : 0, credit: supplier ? 0 : data.closing }} />
        </div>
        <div className="op-act-summary"><b>Задолженность на {dateText(to)}: {moneyFmt(data.closing)} ₸</b><span>{amountWords(data.closing)}</span></div>
        <div className="op-act-signatures"><div>От {party?.name}<br /><br />_______________ / ____________ /<br />М.П.</div><div>От {ours}<br /><br />_______________ / ____________ /<br />М.П.</div></div>
    </section>;
}

function Invoice({ order, seller = 'COND' }) {
    return <article className="op-invoice-doc">
        <h3>Накладная № {String(order.id).slice(0, 8).toUpperCase()}</h3>
        <p>от {dateText(order.shippedAt?.slice(0, 10) || order.deliveryDate)} · {order.status === 'shipped' ? 'Отгружено' : 'Заявка'}</p>
        <div className="op-invoice-parties"><span><b>Поставщик:</b> {seller}</span><span><b>Получатель:</b> {order.company}{order.destination?.outletName ? ' · ' + order.destination.outletName : ''}</span></div>
        <table><thead><tr><th>№</th><th>Товар</th><th>Коробок</th><th>Цена, ₸</th><th>Сумма, ₸</th></tr></thead><tbody>{(order.lines || []).map((line, index) => <tr key={index}><td>{index + 1}</td><td>{line.name}</td><td>{fmt(line.boxes || line.kg)}</td><td>{line.price == null ? '—' : fmt(line.price)}</td><td>{line.price == null ? '—' : moneyFmt((line.packId ? Number(line.boxes) : Number(line.kg)) * Number(line.price))}</td></tr>)}</tbody></table>
        <div className="op-invoice-total"><span>Итого</span><b>{moneyFmt(order.total || 0)} ₸</b></div>
        <div className="op-invoice-signatures"><span>Отпустил: __________</span><span>Получил: __________</span></div>
    </article>;
}

export function InvoiceBatch({ orders = [], onClose }) {
    const [density, setDensity] = useState(2);
    return <section className="op-invoice-sheet">
        <div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={onClose}>Назад</button><label>На листе <select value={density} onChange={e => setDensity(Number(e.target.value))}><option value="2">2 накладные</option><option value="3">3 накладные</option></select></label></div>
        <div className={'op-invoice-list density-' + density}>{orders.map(order => <Invoice key={order.id} order={order} />)}</div>
    </section>;
}

export function InvoiceSingle({ order, onClose }) {
    return <section className="op-invoice-sheet"><div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={onClose}>Назад</button></div><div className="op-invoice-list density-2"><Invoice order={order} /></div></section>;
}
