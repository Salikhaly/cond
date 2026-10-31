const { Op } = require('sequelize');
const db = require('../database/sequelize');
const { User, Product, Income, Report, ReportProducts, Salary, Advance } = require('../models/models');
const { LegacyLink, Production, Payment, Order } = require('../models/operations');
const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
async function production(p, t) {
    if (await LegacyLink.findByPk('production:' + p.id, { transaction: t })) return;
    const start = new Date(p.date + 'T00:00:00+05:00');
    const end = new Date(start.getTime() + 86400000);
    const [report] = await Report.findOrCreate({ where: { userId: p.workerId, createdAt: { [Op.gte]: start, [Op.lt]: end } }, defaults: { userId: p.workerId, createdAt: start, total: 0 }, transaction: t });
    const item = await ReportProducts.create({ reportId: report.id, productId: p.productId, measure: 'kg', quantity: p.kg, price: p.snapshot.ratePerKg, totalForSalary: p.laborCost, createdAt: start }, { transaction: t });
    await report.increment('total', { by: Number(p.kg), transaction: t });
    await LegacyLink.create({ id: 'production:' + p.id, data: { reportId: report.id, reportProductId: item.id } }, { transaction: t });
}
async function payment(p, t) {
    if (await LegacyLink.findByPk('payment:' + p.id, { transaction: t })) return [];
    const scope = await require('../models/operations').PaymentScope.findByPk(p.id,{transaction:t});
    const bounds = scope ? require('./payrollPeriod')(scope.salaryMonth) : null;
    const salaries = await Salary.findAll({ where: { userId: p.workerId, is_active: true, ...(bounds ? {date:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}} : {}) }, order: [['date', 'ASC'], ['id', 'ASC']], transaction: t, lock: t.LOCK.UPDATE });
    let remainder = Number(p.amount);
    const advances = [];
    for (const s of salaries) {
        const part = money(Math.min(remainder, Number(s.total_amount) - Number(s.advanced_amount)));
        if (part <= 0) continue;
        await s.increment('advanced_amount', { by: part, transaction: t });
        const advance = await Advance.create({ salaryId: s.id, amount: part, payment_type: p.note || 'Выплата', createdAt: new Date(p.date + 'T12:00:00+05:00') }, { transaction: t });
        advances.push(advance.id);
        remainder = money(remainder - part);
        if (remainder <= 0) break;
    }
    if(remainder>0){
        const permission=await require('../models/operations').PaymentPermission.findByPk(p.id,{transaction:t});
        if(!permission)throw new Error('Не хватает начислений в зарплатном журнале');
        const period=bounds||require('./payrollPeriod')(p.date.slice(0,7));
        let target=await Salary.findOne({where:{userId:p.workerId,is_active:true,date:{[Op.gte]:period.start,[Op.lt]:period.end}},order:[['id','ASC']],transaction:t,lock:t.LOCK.UPDATE});
        if(!target)target=await Salary.create({userId:p.workerId,total_amount:0,date:period.start},{transaction:t});
        await target.increment('advanced_amount',{by:remainder,transaction:t});
        const advance=await Advance.create({salaryId:target.id,amount:remainder,payment_type:p.note||'Аванс вперёд',createdAt:new Date(p.date+'T12:00:00+05:00')},{transaction:t});
        advances.push(advance.id);
    }
    await LegacyLink.create({ id: 'payment:' + p.id, data: { advanceIds: advances } }, { transaction: t });
    return advances;
}
async function backfill() {
    // Only records authored by the new module are bridged; old client history
    // is not guessed or recomputed. Links make every restart idempotent.
    for (const p of await Production.findAll({ where: { status: 'posted' }, order: [['createdAt', 'ASC']] })) await db.transaction(async t => {
        await User.findByPk(p.workerId, { transaction: t, lock: t.LOCK.UPDATE });
        await production(p, t);
    });
    for (const p of await Payment.findAll({ order: [['createdAt', 'ASC']] })) await db.transaction(async t => {
        await User.findByPk(p.workerId, { transaction: t, lock: t.LOCK.UPDATE });
        await payment(p, t);
    });
    for (const o of await Order.findAll({ where: { status: 'shipped' } })) await db.transaction(async t => {
        for (const line of o.lines) {
            const key = `shipment:${o.id}:${line.productId}`;
            const existing = await LegacyLink.findByPk(key, { transaction: t });
            if (existing && !existing.data.needsQuantityRepair) continue;
            // Older local builds wrote both rows in the same PostgreSQL transaction.
            // xmin gives an exact transaction match; ambiguous matches are left for review.
            const rows = existing ? [{ id: existing.data.incomeId }] : (await db.query('SELECT i.id FROM incomes i JOIN shipment_orders o ON i.xmin = o.xmin WHERE o.id = :id AND i."productId" = :productId AND i."totalWeight" = :kg AND i."totalAmount" = :total', { replacements: { id: o.id, productId: line.productId, kg: line.kg, total: money(line.kg * line.price) }, transaction: t }))[0];
            if (rows.length !== 1) continue;
            const product = await Product.findByPk(line.productId, { transaction: t });
            await Income.update({ weight: product.weight, quantity: Math.round(Number(line.kg) / Number(product.weight) * 10000) / 10000 }, { where: { id: rows[0].id }, transaction: t });
            if (existing) await existing.update({ data: { incomeId: rows[0].id } }, { transaction: t });
            else await LegacyLink.create({ id: key, data: { incomeId: rows[0].id } }, { transaction: t });
        }
    });
}
async function discoverShipmentLinks(t) {
    for (const o of await Order.findAll({ where: { status: 'shipped' }, transaction: t })) for (const line of o.lines) {
        const key = `shipment:${o.id}:${line.productId}`;
        if (await LegacyLink.findByPk(key, { transaction: t })) continue;
        const [rows] = await db.query('SELECT i.id FROM incomes i JOIN shipment_orders o ON i.xmin = o.xmin WHERE o.id = :id AND i."productId" = :productId AND i."totalWeight" = :kg AND i."totalAmount" = :total', { replacements: { id: o.id, productId: line.productId, kg: line.kg, total: money(line.kg * line.price) }, transaction: t });
        if (rows.length === 1) await LegacyLink.create({ id: key, data: { incomeId: rows[0].id, needsQuantityRepair: true } }, { transaction: t });
    }
}
module.exports = { production, payment, backfill, discoverShipmentLinks };
