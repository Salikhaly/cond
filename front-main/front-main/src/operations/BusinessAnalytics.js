import React, { useMemo, useState } from 'react';
import { fmt, moneyFmt } from './api';
import { Field, Table, Empty } from './Fields';

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const dayOf = value => value ? String(value).slice(0, 10) : '';

export default function BusinessAnalytics({ data }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const products = data.products || [];
    const orders = data.orders || [];
    const returns = data.returns || [];
    const productions = data.productions || [];
    const users = data.users || [];
    const packMap = useMemo(() => {
        const map = new Map();
        for (const product of products) for (const pack of product.packs || []) map.set(String(pack.id), { ...pack, product });
        return map;
    }, [products]);
    const inPeriod = value => {
        const day = dayOf(value);
        return (!from || day >= from) && (!to || day <= to);
    };
    const view = useMemo(() => {
        const productRows = new Map();
        const clientRows = new Map();
        const repRows = new Map();
        let revenue = 0, cost = 0, unknown = 0;
        const add = (map, key, values) => {
            const row = map.get(key) || { key, revenue: 0, cost: 0, boxes: 0, unknown: 0 };
            row.revenue = money(row.revenue + values.revenue);
            row.cost = money(row.cost + values.cost);
            row.boxes = money(row.boxes + values.boxes);
            row.unknown += values.unknown;
            map.set(key, row);
        };
        for (const order of orders.filter(order => order.status === 'shipped' && inPeriod(order.shippedAt || order.deliveryDate))) {
            const client = order.destination?.customerName || order.company || 'Без клиента';
            const rep = users.find(user => Number(user.id) === Number(order.userId))?.name || 'Без представителя';
            for (const line of order.lines || []) {
                const pack = packMap.get(String(line.packId));
                const product = pack?.product || products.find(item => Number(item.id) === Number(line.productId));
                const lineRevenue = money(line.packId ? Number(line.boxes) * Number(line.price || 0) : Number(line.kg) * Number(line.price || 0));
                const lineCost = pack ? money(Number(line.boxes) * Number(pack.costPerBox || 0)) : money(Number(line.kg) * Number(product?.priceTotal || 0));
                const missing = !pack || Number(pack.costPerBox || 0) <= 0;
                revenue += lineRevenue;
                cost += lineCost;
                if (missing) unknown += 1;
                const values = { revenue: lineRevenue, cost: lineCost, boxes: Number(line.boxes || 0), unknown: missing ? 1 : 0 };
                add(productRows, String(product?.id || line.productId), { ...values, name: product?.name || line.name });
                add(clientRows, client, values);
                add(repRows, rep, values);
            }
        }
        for (const item of returns.filter(row => row.status === 'posted' && inPeriod(row.postedAt))) {
            const amount = money(item.total);
            revenue -= amount;
            cost -= money((item.lines || []).reduce((sum, line) => {
                const product = products.find(row => Number(row.id) === Number(line.productId));
                return sum + Number(line.kg) * Number(product?.priceTotal || 0);
            }, 0));
            const client = item.customer?.company || item.contactName || 'Без клиента';
            add(clientRows, client, { revenue: -amount, cost: 0, boxes: 0, unknown: 0 });
        }
        const productList = [...productRows.values()].map(row => ({ ...row, margin: money(row.revenue - row.cost), rate: row.revenue ? money((row.revenue - row.cost) / row.revenue * 100) : 0 })).sort((a, b) => b.revenue - a.revenue);
        const clientList = [...clientRows.values()].map(row => ({ ...row, margin: money(row.revenue - row.cost) })).sort((a, b) => b.revenue - a.revenue);
        const repList = [...repRows.values()].map(row => ({ ...row, margin: money(row.revenue - row.cost) })).sort((a, b) => b.revenue - a.revenue);
        const total = productList.reduce((sum, row) => sum + row.revenue, 0);
        let cumulative = 0;
        const abc = productList.map(row => {
            cumulative += row.revenue;
            const share = total ? cumulative / total : 1;
            return { ...row, share: share * 100, group: share <= .8 ? 'A' : share <= .95 ? 'B' : 'C' };
        });
        const plan = new Map();
        for (const order of orders.filter(order => ['submitted', 'approved', 'shipped'].includes(order.status) && inPeriod(order.deliveryDate))) {
            for (const line of order.lines || []) {
                const key = String(line.productId);
                const row = plan.get(key) || { key, name: line.name, plan: 0, fact: 0 };
                row.plan += Number(line.boxes || 0);
                plan.set(key, row);
            }
        }
        for (const production of productions.filter(row => row.status === 'posted' && inPeriod(row.date))) {
            const row = plan.get(String(production.productId)) || { key: String(production.productId), name: products.find(item => Number(item.id) === Number(production.productId))?.name || 'Товар', plan: 0, fact: 0 };
            row.fact += Number(production.boxes || 0);
            plan.set(String(production.productId), row);
        }
        const lossByReason = new Map();
        for (const item of returns.filter(row => row.status === 'posted' && inPeriod(row.postedAt))) {
            const reason = item.reason || 'Без причины';
            const row = lossByReason.get(reason) || { reason, count: 0, kg: 0, amount: 0 };
            row.count += 1;
            row.amount += Number(item.total || 0);
            row.kg += (item.lines || []).reduce((sum, line) => sum + Number(line.kg || 0), 0);
            lossByReason.set(reason, row);
        }
        const bonuses = new Map();
        for (const item of data.clientBonuses || []) {
            if(item.kind!=='goods'||item.date<from||item.date>to)continue;
            const customer = data.customers?.find(row => String(row.id) === String(item.customerId));
            const key = customer?.name || 'Клиент';
            bonuses.set(key, money((bonuses.get(key) || 0) + Number(item.goods?.knownCost||0)));
        }
        return {
            revenue: money(revenue), cost: money(cost), margin: money(revenue - cost), unknown,
            productList, clientList, repList, abc,
            plan: [...plan.values()].map(row => ({ ...row, delta: money(row.fact - row.plan) })).filter(row => row.plan || row.fact),
            lossByReason: [...lossByReason.values()].sort((a, b) => b.amount - a.amount),
            bonuses: [...bonuses.entries()].sort((a, b) => b[1] - a[1]),
        };
    }, [orders, returns, productions, products, users, data.clientBonuses, data.customers, from, to, packMap]);

    return <>
        <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">АНАЛИТИКА</span><h2>Маржа, ABC и план производства</h2></div></div><div className="op-form-grid"><Field label="С даты" type="date" value={from} onChange={e => setFrom(e.target.value)} /><Field label="По дату" type="date" value={to} onChange={e => setTo(e.target.value)} /></div><p className="op-muted">Продажи после возвратов, себестоимость по текущей оценке коробок. Позиции без себестоимости помечены.</p><div className="op-costs"><span>Продажи <b>{moneyFmt(view.revenue)} ₸</b></span><span>Себестоимость <b>{moneyFmt(view.cost)} ₸</b></span><strong>Маржа <b>{moneyFmt(view.margin)} ₸</b></strong>{view.unknown > 0 && <span>Без оценки <b>{view.unknown}</b></span>}</div></section>
        <section className="op-card"><h2>Маржа по товарам</h2><Table mobileCards headers={['Товар','Продажи','Себестоимость','Маржа','Маржа %']}>{view.productList.map(row => <tr key={row.key}><td>{row.name}</td><td>{moneyFmt(row.revenue)}</td><td>{moneyFmt(row.cost)}</td><td className={row.margin < 0 ? 'op-margin-alert' : ''}>{moneyFmt(row.margin)}</td><td>{fmt(row.rate)}%</td></tr>)}</Table>{!view.productList.length && <Empty>Продаж за период нет.</Empty>}</section>
        <section className="op-card"><h2>Маржа по клиентам</h2><Table mobileCards headers={['Клиент','Продажи','Себестоимость','Маржа']}>{view.clientList.map(row => <tr key={row.key}><td>{row.key}</td><td>{moneyFmt(row.revenue)}</td><td>{moneyFmt(row.cost)}</td><td className={row.margin < 0 ? 'op-margin-alert' : ''}>{moneyFmt(row.margin)}</td></tr>)}</Table>{!view.clientList.length && <Empty>Нет отгрузок.</Empty>}</section>
        <section className="op-card"><h2>Маржа по представителям</h2><Table mobileCards headers={['Представитель','Продажи','Маржа','Коробок']}>{view.repList.map(row => <tr key={row.key}><td>{row.key}</td><td>{moneyFmt(row.revenue)}</td><td className={row.margin < 0 ? 'op-margin-alert' : ''}>{moneyFmt(row.margin)}</td><td>{fmt(row.boxes)}</td></tr>)}</Table></section>
        <section className="op-card"><h2>ABC-анализ товаров</h2><p className="op-muted">A — 80% выручки, B — следующие 15%, C — остальные.</p><Table mobileCards headers={['Группа','Товар','Выручка','Доля накопительно']}>{view.abc.map(row => <tr key={row.key}><td><b>{row.group}</b></td><td>{row.name}</td><td>{moneyFmt(row.revenue)}</td><td>{fmt(row.share)}%</td></tr>)}</Table></section>
        <section className="op-card"><h2>План / факт производства</h2><Table mobileCards headers={['Товар','План, коробок','Факт, коробок','Отклонение']}>{view.plan.map(row => <tr key={row.key}><td>{row.name}</td><td>{fmt(row.plan)}</td><td>{fmt(row.fact)}</td><td className={row.delta < 0 ? 'op-margin-alert' : ''}>{row.delta > 0 ? '+' : ''}{fmt(row.delta)}</td></tr>)}</Table>{!view.plan.length && <Empty>Нет заявок и выпусков.</Empty>}</section>
        <section className="op-card"><h2>Потери и причины возвратов</h2><Table mobileCards headers={['Причина','Возвратов','Кг','Сумма']}>{view.lossByReason.map(row => <tr key={row.reason}><td>{row.reason}</td><td>{row.count}</td><td>{fmt(row.kg)}</td><td>{moneyFmt(row.amount)} ₸</td></tr>)}</Table>{!view.lossByReason.length && <Empty>Возвратов нет.</Empty>}</section>
        <section className="op-card"><h2>Бонусы клиентов</h2><Table mobileCards headers={['Клиент','Себестоимость бонусных товаров']}>{view.bonuses.map(([name, amount]) => <tr key={name}><td>{name}</td><td>{moneyFmt(amount)} ₸</td></tr>)}</Table>{!view.bonuses.length && <Empty>Бонусов пока нет.</Empty>}</section>
    </>;
}
