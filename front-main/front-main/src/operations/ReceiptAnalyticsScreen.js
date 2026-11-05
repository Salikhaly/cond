import React, { useEffect, useState } from 'react';
import { fmt, moneyFmt, today } from './api';
import { Field, Table, Empty } from './Fields';
import { receiptAnalytics, periodRange } from './receiptAnalytics';

const periods = [['2m', '2 месяца'], ['3m', '3 месяца'], ['12m', 'Год'], ['custom', 'Свой период']];

export default function ReceiptAnalyticsScreen({ data }) {
    const [period, setPeriod] = useState('3m');
    const [from, setFrom] = useState(() => periodRange('3m', today()).from);
    const [to, setTo] = useState(() => today());
    const [materialId, setMaterialId] = useState('');
    const [view, setView] = useState('suppliers');
    const materials = data.materials || [];
    useEffect(() => {
        if (materialId) return;
        const hasReceipts = m => (data.receipts || []).some(r => r.materialId === m.id);
        const withPack = materials.find(m => (data.receipts || []).some(r => r.materialId === m.id && (r.boxCount != null || r.pricePerUnit != null)));
        const egg = materials.find(m => /яйц/i.test(m.name) && hasReceipts(m)) || materials.find(m => /яйц/i.test(m.name));
        const piece = materials.find(m => m.unit === 'шт' && hasReceipts(m));
        setMaterialId(String(egg?.id || withPack?.id || piece?.id || ''));
    }, [materialId, materials, data.receipts]);
    const choosePeriod = value => {
        setPeriod(value);
        if (value !== 'custom') {
            const range = periodRange(value, today());
            setFrom(range.from);
            setTo(range.to);
        }
    };
    const analytics = receiptAnalytics(data.receiptDocuments, data.receipts, materials, { from, to, materialId, corrections:data.receiptCorrections });
    const unit = analytics.material?.unit || 'шт';
    const unitPriceLabel = `₸/${unit}`;
    const quantityLabel = unit === 'шт' ? 'Штук' : `Количество, ${unit}`;
    const noData = analytics.rows === 0;
    const monthLabel = value => {
        if (!value) return '';
        const [year, month] = value.split('-');
        const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1))).replace(/\s*г\.$/, '');
        return label.charAt(0).toUpperCase() + label.slice(1);
    };
    const percent = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
    return <>
        <section className="op-card op-receipt-analytics-head">
            <div className="op-section-heading"><div><h2>Аналитика прихода</h2><p className="op-muted">Коробки и штуки считаются по сохранённым данным прихода. Старые записи без коробок показаны по количеству и сумме.</p></div></div>
            <div className="cond-segments" role="group" aria-label="Период аналитики">
                {periods.map(([id, label]) => <button type="button" key={id} className={period === id ? 'active' : ''} aria-pressed={period === id} onClick={() => choosePeriod(id)}>{label}</button>)}
            </div>
            {period === 'custom' && <div className="op-form-grid"><Field label="С даты" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /><Field label="По дату" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></div>}
            <Field label="Материал">
                <select value={materialId} onChange={e => setMaterialId(e.target.value)}>
                    <option value="">Все материалы</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} · {m.unit}</option>)}
                </select>
            </Field>
            <div className="op-stats op-receipt-analytics-totals">
                <article><span>Коробок</span><strong>{analytics.totals.hasBoxes ? fmt(analytics.totals.boxes) : '—'}</strong><p>По выбранному материалу</p></article>
                <article><span>{quantityLabel}</span><strong>{fmt(analytics.totals.pieces)}</strong><p>{unit}</p></article>
                <article><span>Сумма прихода</span><strong>{moneyFmt(analytics.totals.amount)} <small>₸</small></strong><p>С допзатратами</p></article>
            </div>
            {analytics.totals.unknownQuantity > 0 && <p className="op-muted">В старых записях без количества: {analytics.totals.unknownQuantity}. Они учтены в сумме, но не в штуках.</p>}
        </section>
        <section className="op-card op-receipt-analytics-body">
            <nav className="op-report-tabs" aria-label="Аналитика прихода">
                <button type="button" className={view === 'suppliers' ? 'active' : ''} aria-pressed={view === 'suppliers'} onClick={() => setView('suppliers')}>Поставщики</button>
                <button type="button" className={view === 'prices' ? 'active' : ''} aria-pressed={view === 'prices'} onClick={() => setView('prices')}>Сравнение цен</button>
                <button type="button" className={view === 'months' ? 'active' : ''} aria-pressed={view === 'months'} onClick={() => setView('months')}>По месяцам</button>
            </nav>
            {noData ? <Empty>За выбранный период приходов нет.</Empty> : view === 'suppliers' ? <>
                <Table mobileCards headers={['Поставщик', 'Коробка, шт', 'Коробок', quantityLabel, `Средняя ${unitPriceLabel}`, `Последняя ${unitPriceLabel}`, 'Сумма', 'Частая причина']}>
                    {analytics.suppliers.map(s => <tr key={s.supplier}><td>{s.supplier}</td><td>{s.lastPerBox ? fmt(s.lastPerBox) : '—'}</td><td>{s.hasBoxes ? fmt(s.boxes) : '—'}</td><td>{fmt(s.pieces)}</td><td>{s.avg == null ? '—' : moneyFmt(s.avg)}</td><td>{s.lastPrice == null ? '—' : moneyFmt(s.lastPrice)}</td><td>{moneyFmt(s.amount)} ₸</td><td>{s.topReason || '—'}{s.topReasonCount > 0 ? ` · ${s.topReasonCount}` : ''}</td></tr>)}
                </Table>
            </> : view === 'prices' ? <>
                <Table mobileCards headers={['Поставщик', 'Коробка, шт', `Средняя ${unitPriceLabel}`, `Последняя ${unitPriceLabel}`, 'От минимальной']}>
                    {analytics.comparison.map(s => <tr key={s.supplier}><td>{s.supplier}</td><td>{s.lastPerBox ? fmt(s.lastPerBox) : '—'}</td><td><b>{moneyFmt(s.avg)}</b></td><td>{s.lastPrice == null ? '—' : moneyFmt(s.lastPrice)}</td><td>{s.delta == null ? '—' : s.delta <= 0.00001 ? 'Минимум' : `+${moneyFmt(s.delta)} ₸ · ${percent(s.deltaPercent)}%`}</td></tr>)}
                </Table>
                {analytics.comparison.length > 1 && <p className="op-muted">Сравнение по средней цене за единицу. Минимум — самый дешёвый поставщик выбранного периода.</p>}
            </> : <>
                <Table mobileCards headers={['Месяц', 'Поставщик', 'Коробка, шт', 'Коробок', quantityLabel, `Средняя ${unitPriceLabel}`, `Последняя ${unitPriceLabel}`, 'Сумма', 'От минимальной']}>
                    {analytics.months.map(m => <tr key={m.month + m.supplier}><td>{monthLabel(m.month)}</td><td>{m.supplier}</td><td>{m.lastPerBox ? fmt(m.lastPerBox) : '—'}</td><td>{m.hasBoxes ? fmt(m.boxes) : '—'}</td><td>{fmt(m.pieces)}</td><td>{m.avg == null ? '—' : moneyFmt(m.avg)}</td><td>{m.lastPrice == null ? '—' : moneyFmt(m.lastPrice)}</td><td>{moneyFmt(m.amount)} ₸</td><td>{m.delta == null ? '—' : m.delta <= 0.00001 ? 'Минимум' : `+${moneyFmt(m.delta)} ₸ · ${percent(m.deltaPercent)}%`}</td></tr>)}
                </Table>
                <p className="op-muted">Сравнение идёт внутри каждого месяца: минимум — самый дешёвый поставщик этого месяца.</p>
            </>}
        </section>
    </>;
}
