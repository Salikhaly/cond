import {reconciliation} from './reconciliationMetrics';
import {workbook,download} from './reportExport';
import React, { useEffect, useMemo, useState } from 'react';
import { api, fmt, moneyFmt, today } from './api';
import './print.css';

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const dateText = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('ru-RU') : '';
const rowDate = value => value ? String(value).slice(0, 10) : '';
const monthStart = () => today().slice(0,7)+'-01';
const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const triad = (value, feminine = false) => {
    const result = [];
    if (value >= 100) result.push(hundreds[Math.floor(value / 100)]);
    const rest = value % 100;
    if (rest >= 20) { result.push(tens[Math.floor(rest / 10)]); if (rest % 10) result.push(ones[rest % 10]); }
    else if (rest) result.push(ones[rest]);
    let text = result.join(' ');
    if (feminine) text = text.replace(/\bодин$/, 'одна').replace(/\bдва$/, 'две');
    return text;
};
const amountWords = value => {
    let n = Math.round(Number(value) || 0);
    if (!n) return 'ноль тенге';
    const parts = [];
    const millions = Math.floor(n / 1000000);
    if (millions) { parts.push(triad(millions), millions % 10 === 1 && millions % 100 !== 11 ? 'миллион' : millions % 10 >= 2 && millions % 10 <= 4 && (millions % 100 < 10 || millions % 100 >= 20) ? 'миллиона' : 'миллионов'); n %= 1000000; }
    const thousands = Math.floor(n / 1000);
    if (thousands) { parts.push(triad(thousands, true), thousands % 10 === 1 && thousands % 100 !== 11 ? 'тысяча' : thousands % 10 >= 2 && thousands % 10 <= 4 && (thousands % 100 < 10 || thousands % 100 >= 20) ? 'тысячи' : 'тысяч'); n %= 1000; }
    if (n) parts.push(triad(n));
    return parts.join(' ').replace(/\s+/g, ' ').trim() + ' тенге';
};

function ActTable({ title, rows, opening, debit, credit, closing }) {
    return <div className="op-act-side"><h4>{title}</h4><table><thead><tr><th>Дата</th><th>Документ</th><th>Дебет</th><th>Кредит</th></tr></thead><tbody>
        <tr className="op-act-opening"><td colSpan="2">Сальдо на начало</td><td>{moneyFmt(opening.debit)}</td><td>{moneyFmt(opening.credit)}</td></tr>
        {rows.map((row, index) => <tr key={index}><td>{dateText(row.date)}</td><td>{row.document}</td><td>{row.debit ? moneyFmt(row.debit) : ''}</td><td>{row.credit ? moneyFmt(row.credit) : ''}</td></tr>)}
        <tr className="op-act-turnover"><td colSpan="2">Обороты за период</td><td>{moneyFmt(debit)}</td><td>{moneyFmt(credit)}</td></tr>
        <tr className="op-act-closing"><td colSpan="2">Сальдо на конец</td><td>{moneyFmt(closing.debit)}</td><td>{moneyFmt(closing.credit)}</td></tr>
    </tbody></table></div>;
}

export function ReconciliationAct({ party, supplier = false, entries: ledgerEntries = [], returns: partyReturns = [], company = 'COND', onClose }) {
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(today());
    const [actNumber, setActNumber] = useState('');
    useEffect(() => {
        if (!party?.key) return;
        let active = true;
        api('/act-number', { partyKey: party.key, from, to }, 'POST').then(result => { if (active) setActNumber(result.label || ''); }).catch(() => {});
        return () => { active = false; };
    }, [party?.key, from, to]);
    const data = useMemo(() => reconciliation({party,supplier,entries:ledgerEntries.length?ledgerEntries:party?.entries||[],returns:partyReturns,from,to}),[party,supplier,ledgerEntries,partyReturns,from,to]);
    const sides=value=>supplier?{debit:Math.max(0,-value),credit:Math.max(0,value)}:{debit:Math.max(0,value),credit:Math.max(0,-value)};
    const opening=sides(data.opening),closing=sides(data.closing),flip=value=>({debit:value.credit,credit:value.debit});
    const exportAct=()=>download(workbook([{name:'Акт сверки',rows:[['Акт сверки',actNumber],['Контрагент',party.name],['Период',from,to],['Долг на начало',data.opening],['Дата','Документ','Дебет','Кредит','Долг / аванс'],...data.rows.map(r=>[r.date,r.document,r.debit,r.credit,r.balance]),['Обороты','',data.debit,data.credit],['Долг на конец',data.closing]]}]),'COND-Акт-сверки.xlsx');
    const ours = company;
    return <section className="op-act-document">
        <div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={exportAct}>Excel</button><button className="secondary" onClick={onClose}>Назад</button></div>
        <div className="op-act-toolbar op-no-print"><label>Период с <input type="date" max={to} value={from} onChange={e => setFrom(e.target.value)} /></label><label>по <input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></label><span>1 лист A4</span></div>
        <h2 className="op-act-title">Акт сверки № {actNumber || String(party?.key || party?.id || '').split(':').pop().replace(/-/g, '').slice(0, 8).toUpperCase()} от {dateText(to)} г.</h2>
        <p className="op-act-subtitle">взаимных расчётов за период с {dateText(from)} по {dateText(to)} между <b>{party?.name}</b> и <b>{ours}</b></p>
        <p className="op-act-subtitle">Мы, нижеподписавшиеся, составили настоящий акт сверки в том, что состояние взаимных расчётов по данным учёта следующее:</p>
        <div className="cond-statement-mobile op-no-print"><div className="op-costs"><span>На начало <b>{moneyFmt(data.opening)} ₸</b></span><strong>{data.closing<0?'Аванс':supplier?'Наш долг':'Долг клиента'} <b>{moneyFmt(Math.abs(data.closing))} ₸</b></strong></div>{data.rows.map((r,i)=><article className="cond-document" key={i}><small>{dateText(r.date)}</small><b>{r.document}</b><p>{r.credit>0?(supplier?'Получено товара':'Зачтено / оплачено'):(supplier?'Оплатили':'Отгружено')}: {moneyFmt(r.debit||r.credit)} ₸</p><small>{r.balance<0?'Аванс':'Долг'}: {moneyFmt(Math.abs(r.balance))} ₸</small></article>)}</div>
        <div className="op-act-grid">
            <ActTable title={'По данным ' + (party?.name || '')} rows={data.rows.map(row => ({ ...row }))} opening={opening} debit={data.debit} credit={data.credit} closing={closing} />
            <ActTable title={'По данным ' + ours} rows={data.rows.map(row => ({ ...row, debit: row.credit, credit: row.debit }))} opening={flip(opening)} debit={data.credit} credit={data.debit} closing={flip(closing)} />
        </div>
        <div className="op-act-summary"><b>{data.closing<0?(supplier?'Аванс поставщику':'Аванс клиента'):(supplier?'Мы должны поставщику':'Клиент должен нам')} на {dateText(to)}: {moneyFmt(Math.abs(data.closing))} ₸</b><span>{amountWords(Math.abs(data.closing))}</span></div>
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
