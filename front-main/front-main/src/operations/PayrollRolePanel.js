import React, { useMemo } from 'react';
import { fmt, moneyFmt } from './api';
import { Table, Empty } from './Fields';

const monthOf = value => value ? String(value).slice(0, 7) : '';

export default function PayrollRolePanel({ data, person, month }) {
    const view = useMemo(() => {
        if (person.role === 'representative') {
            const orders = (data.orders || []).filter(order => order.status === 'shipped' && Number(order.userId) === Number(person.id) && monthOf(order.shippedAt || order.deliveryDate) === month);
            const returns = (data.returns || []).filter(row => row.status === 'posted' && orders.some(order => String(order.id) === String(row.orderId)));
            const boxes = orders.reduce((sum, order) => sum + (order.lines || []).reduce((lineSum, line) => lineSum + Number(line.boxes || 0), 0), 0);
            const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0) - returns.reduce((sum, row) => sum + Number(row.total || 0), 0);
            const accrual = (data.repAccruals || []).filter(row => Number(row.userId) === Number(person.id) && row.month === month).sort((a, b) => Number(b.version) - Number(a.version))[0];
            return { kind: 'representative', orders, returns, boxes, revenue, accrual };
        }
        const productions = (data.productions || []).filter(row => row.status === 'posted' && Number(row.workerId) === Number(person.id) && monthOf(row.date) === month);
        const boxes = productions.reduce((sum, row) => sum + Number(row.boxes || 0), 0);
        const labor = productions.reduce((sum, row) => sum + Number(row.laborCost || 0), 0);
        const grouped = [];
        for (const row of productions) {
            const product = (data.products || []).find(item => Number(item.id) === Number(row.productId));
            const pack = (product?.packs || []).find(item => String(item.id) === String(row.packId));
            const key = String(row.productId) + ':' + String(row.packId || '');
            const existing = grouped.find(item => item.key === key);
            if (existing) { existing.boxes += Number(row.boxes || 0); existing.labor += Number(row.laborCost || 0); }
            else grouped.push({ key, name: product?.name || 'Товар', capacity: pack?.capacityKg || null, boxes: Number(row.boxes || 0), labor: Number(row.laborCost || 0) });
        }
        return { kind: 'employee', productions, boxes, labor, grouped };
    }, [data, person, month]);
    if (view.kind === 'representative') return <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">ТОРГОВЫЙ ПРЕДСТАВИТЕЛЬ</span><h2>Продажи за месяц</h2></div></div><div className="op-stats op-payroll-totals"><article><span>Отгружено</span><strong>{fmt(view.boxes)} <small>коробок</small></strong><p>{view.orders.length} заказов</p></article><article><span>Продажи после возвратов</span><strong>{moneyFmt(view.revenue)} <small>₸</small></strong></article><article><span>Возвраты</span><strong>{view.returns.length}</strong><p>{moneyFmt(view.returns.reduce((sum, row) => sum + Number(row.total || 0), 0))} ₸</p></article><article><span>Начислено по расчёту</span><strong>{moneyFmt(view.accrual?.delta || 0)} <small>₸</small></strong><p>{view.accrual ? 'месячный расчёт' : 'нет расчёта'}</p></article></div>{view.orders.length ? <Table mobileCards headers={['Дата', 'Клиент / магазин', 'Коробок', 'Сумма']}>{view.orders.map(order => <tr key={order.id}><td>{order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('ru-RU') : order.deliveryDate}</td><td>{order.destination?.outletName || order.company}</td><td>{fmt((order.lines || []).reduce((sum, line) => sum + Number(line.boxes || 0), 0))}</td><td>{moneyFmt(order.total)} ₸</td></tr>)}</Table> : <Empty>Отгрузок за месяц нет.</Empty>}</section>;
    return <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">РАБОТНИК ПРОИЗВОДСТВА</span><h2>Выпуск за месяц</h2></div></div><div className="op-stats op-payroll-totals"><article><span>Выпущено</span><strong>{fmt(view.boxes)} <small>коробок</small></strong><p>{view.productions.length} выпусков</p></article><article><span>Сдельно начислено</span><strong>{moneyFmt(view.labor)} <small>₸</small></strong></article></div>{view.grouped.length ? <Table mobileCards headers={['Товар', 'Коробка', 'Коробок', 'Начислено']}>{view.grouped.map(row => <tr key={row.key}><td>{row.name}</td><td>{row.capacity ? fmt(row.capacity) + ' кг' : '—'}</td><td>{fmt(row.boxes)}</td><td>{moneyFmt(row.labor)} ₸</td></tr>)}</Table> : <Empty>Выпусков за месяц нет.</Empty>}</section>;
}
