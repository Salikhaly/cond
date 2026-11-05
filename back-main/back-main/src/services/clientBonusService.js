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
    if (body.kind !== 'goods') throw ApiError.badRequest('Бонус выдаётся товаром. Выберите поставку и товары');
    if (![body.customerId,body.sourceOrderId].every(v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v))) throw ApiError.badRequest('Выберите клиента и поставку');
    return require('./idempotency').transaction(async t => {
        const customer = await M.Customer.findByPk(body.customerId, {transaction:t});
        if (!customer) throw ApiError.notFound('Клиент не найден');
        const source = await M.Order.findByPk(body.sourceOrderId, {transaction:t,lock:t.LOCK.UPDATE});
        const destination = source && await M.Destination.findByPk(source.id, {transaction:t});
        if (!source || source.status !== 'shipped' || !destination || destination.customerId !== customer.id)
            throw ApiError.badRequest('Выберите отгруженную поставку этого клиента');
        const isBonus = await M.ClientBonus.findAll({where:{kind:'goods'},transaction:t});
        if (isBonus.some(row=>row.goods?.shipmentOrderId===source.id)) throw ApiError.badRequest('Выберите обычную поставку, а не бонус');
        if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length>100 || body.lines.some(l=>!l.packId))
            throw ApiError.badRequest('Выберите товары и количество коробок');
        const today = require('./businessDay').day(new Date());
        if (body.date && date(body.date)!==today) throw ApiError.badRequest('Бонус проводится датой фактической выдачи — сегодня');
        const ops = require('./operationsService');
        const order = await ops.order(user, {outletId:destination.outletId,deliveryDate:today,
            note:'Бонус к поставке № '+source.id.slice(0,8).toUpperCase(),lines:body.lines});
        await ops.orderStatus(user,order.id,{status:'approved',prices:order.lines.map(()=>0)});
        await ops.orderStatus(user,order.id,{status:'shipped'});
        const events = await M.CostEvent.findAll({where:{orderId:order.id,kind:'shipment'},transaction:t});
        return M.ClientBonus.create({customerId:customer.id,outletId:destination.outletId,amount:0,kind:'goods',date:today,
            reason:String(body.reason||'Бонус товаром').trim().slice(0,2000),actorId:user.id,actorName:user.name,
            goods:{sourceOrderId:source.id,shipmentOrderId:order.id,lines:order.lines.map(l=>({...l,price:0})),
                knownCost:money(events.reduce((sum,e)=>sum+Number(e.value),0)),
                complete:events.every(e=>Number(e.kg)-Number(e.knownKg)<0.00011)}},{transaction:t});
    });
}

module.exports = { list, save };
