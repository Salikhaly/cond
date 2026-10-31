const {payrollTotals}=require('./payrollMetrics');
const {returnSales}=require('./returnMetrics');
const number = v => Number(v || 0);
const sum = (rows, key) => rows.reduce((total, row) => total + number(row[key]), 0);
const day = value => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
};
function overviewMetrics(data, from, to) {
    const within = value => { const d = day(value); return d >= from && d <= to; };
    const originalSales=(data.incomes||[]).filter(r=>within(r.date));
    const adjustments=returnSales(data).filter(r=>within(r.date));
    const sales=[...originalSales,...adjustments];
    const expenses = (data.outcomes || []).filter(r => within(r.date));
    const production = data.productions.filter(r => r.status === 'posted' && within(r.date));
    const newOrders = data.orders.filter(o => o.status === 'submitted');
    const approved = data.orders.filter(o => o.status === 'approved');
    const ranking = new Map();
    for (const sale of sales) {
        const item = ranking.get(sale.productId) || { id: sale.productId, name: data.products.find(p => p.id === sale.productId)?.name || sale.product?.name || `Товар №${sale.productId}`, kg: 0, revenue: 0 };
        item.kg += number(sale.totalWeight); item.revenue += number(sale.totalAmount); ranking.set(sale.productId, item);
    }
    const workers = (data.workers || []).map(worker => {
        const rows = production.filter(p => p.workerId === worker.id);
        return { ...worker, kg: sum(rows, 'kg'), accrued: sum(rows, 'laborCost') };
    }).filter(w => w.kg > 0).sort((a, b) => b.kg - a.kg);
    return {
        newOrders, approved, drafts: data.productions.filter(p => p.status === 'draft'),
        stockKg: sum(data.products, 'kg'), freeKg: sum(data.products, 'availableKg'), reservedKg: sum(data.products, 'reservedKg'),
        materialValue: data.materials.reduce((total, m) => total + number(m.quantity) * number(m.unitCost), 0),
        ...payrollTotals(data.payroll),
        grossRevenue:sum(originalSales,'totalAmount'),returnTotal:adjustments.reduce((s,l)=>s-number(l.totalAmount),0),revenue: sum(sales, 'totalAmount'), expenses: sum(expenses, 'totalAmount'), shippedKg: sum(sales, 'totalWeight'),
        producedKg: sum(production, 'kg'), productionCost: sum(production, 'totalCost'), accrued: sum(production, 'laborCost'),
        ranking: [...ranking.values()].sort((a, b) => b.revenue - a.revenue), workers,
        ordersInPeriod: data.orders.filter(o => within(o.createdAt)).length,
        emptyMaterials: data.materials.filter(m => number(m.quantity) <= 0)
    };
}
module.exports = { overviewMetrics, day };
