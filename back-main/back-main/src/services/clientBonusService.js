const M = require('../models/operations');
const ApiError = require('../exceptions/ApiError');

const admin = user => { if (user.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор'); };
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const date = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw ApiError.badRequest('Укажите дату'); return value; };

async function list(user, customerId) {
    admin(user);
    return M.ClientBonus.findAll({ where: customerId ? { customerId } : {}, order: [['date', 'DESC'], ['createdAt', 'DESC']] });
}

async function save(user, body) {
    admin(user);
    const customer = await M.Customer.findByPk(body.customerId);
    if (!customer) throw ApiError.notFound('Клиент не найден');
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw ApiError.badRequest('Укажите сумму бонуса');
    if (!['accrual', 'spent'].includes(body.kind)) throw ApiError.badRequest('Выберите начисление или списание');
    if (typeof body.reason !== 'string' || !body.reason.trim()) throw ApiError.badRequest('Укажите причину');
    return M.ClientBonus.create({
        customerId: customer.id,
        outletId: body.outletId || null,
        amount: money(amount),
        kind: body.kind,
        date: date(body.date),
        reason: body.reason.trim().slice(0, 2000),
        actorId: user.id,
        actorName: user.name,
    });
}

module.exports = { list, save };
