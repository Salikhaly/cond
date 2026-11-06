const db = require('../database/sequelize'),
  M = require('../models/operations');
const {
  Product,
  Income,
  BusinessRelation,
  Outcome,
  OutcomeCategory
} = require('../models/models');
const {
    Op
  } = require('sequelize'),
  ApiError = require('../exceptions/ApiError');
const round = n => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000,
  money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const fail = message => {
    throw ApiError.badRequest(message);
  },
  admin = u => {
    if (u.role !== 'super_admin') throw ApiError.forbiddenRequest('Проведение и расчёты подтверждает администратор');
  };
const staff = u => {
  if (!['super_admin', 'representative'].includes(u.role)) throw ApiError.forbiddenRequest();
};
const text = (v, label, max = 250) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) fail('Укажите ' + label);
  return v.trim();
};
const qty = v => {
  if (!['number', 'string'].includes(typeof v) || String(v).trim() === '' || !Number.isFinite(Number(v)) || Number(v) <= 0 || Number(v) > 1e8 || Math.abs(Number(v) - round(v)) > 1e-8) fail('Количество должно быть положительным, до 4 знаков после запятой');
  return Number(v);
};
const amount = v => {
  const n = qty(v);
  if (Math.abs(n - money(n)) > 1e-8) fail('Сумма — до двух знаков после запятой');
  return n;
};
const uuid = id => {
  if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) fail('Некорректный документ');
  return id;
};
const get = (model, id, t) => model.findByPk(uuid(id), {
  transaction: t,
  lock: t.LOCK.UPDATE
});
const required = (r, label = 'Документ') => {
  if (!r) throw ApiError.notFound(label + ' не найден');
  return r;
};
const event = (u, r, action, before, after, reason = '', t) => M.ReturnEvent.create({
  returnId: r.id,
  actorId: u.id,
  actorName: u.name,
  action,
  before,
  after,
  reason
}, {
  transaction: t
});
const snapshot = r => JSON.parse(JSON.stringify(r));
// Returns are entered in kg; box prices must be converted before calculating a refund.
function soldProduct(order,productId){
  const lines=order.lines.filter(l=>l.productId===Number(productId));
  if(!lines.length)return null;
  const kg=round(lines.reduce((sum,l)=>sum+Number(l.kg),0));
  const total=money(lines.reduce((sum,l)=>sum+money(Number(l.price)*(l.packId?Number(l.boxes):Number(l.kg))),0));
  return {...lines[0],kg,price:kg>0?total/kg:0};
}
async function orderFor(u, id, t) {
  staff(u);
  const order = required(await get(M.Order, id, t), 'Отгрузка');
  if (u.role !== 'super_admin' && order.userId !== u.id) throw ApiError.forbiddenRequest('Эта отгрузка принадлежит другому представителю');
  if (order.status !== 'shipped') fail('Возврат оформляется по отгруженной накладной');
  return order;
}
async function customerFor(order, t) {
  const dest = await M.Destination.findByPk(order.id, {
      transaction: t
    }),
    customer = dest ? await M.Customer.findByPk(dest.customerId, {
      transaction: t
    }) : null;
  const link = await M.LegacyLink.findByPk(`shipment:${order.id}:${order.lines[0].productId}`, {
    transaction: t
  });
  const income = link ? await Income.findByPk(link.data.incomeId, {
    transaction: t
  }) : null;
  return {
    company: order.company,
    destination: dest?.get({
      plain: true
    }) || null,
    businessRelationId: income?.businessRelationId || null,
    scope: customer?.debtScope || 'company',
    scopeKey: dest ? customer?.debtScope === 'outlet' ? 'outlet:' + dest.outletId : 'customer:' + dest.customerId : 'legacy:' + order.company
  };
}
async function returnFor(u, id, t) {
  staff(u);
  const r = required(await get(M.GoodsReturn, id, t), 'Возврат');
  await orderFor(u, r.orderId, t);
  return r;
}
async function changeStock(productId, kg, t) {
  const p = required(await Product.findByPk(productId, {
    transaction: t,
    lock: t.LOCK.UPDATE
  }), 'Товар');
  if (!p.is_active) fail('Сначала восстановите товар из архива: ' + p.name);
  const stock = required(await M.Stock.findByPk(productId, {
    transaction: t,
    lock: t.LOCK.UPDATE
  }), 'Остаток');
  const next = round(Number(stock.kg) + kg);
  if (!require('./stockPolicy').allowNegative() && next < Number(stock.reservedKg) - .00001) fail('Не хватает свободного товара: ' + p.name);
  await stock.update({
    kg: next
  }, {
    transaction: t
  });
  await p.update({
    weightTotal: next,
    quantity: Math.floor((next + 1e-8) / Number(p.weight))
  }, {
    transaction: t
  });
  return p;
}
async function allocate(u, r, productId, kind, kg, note, t) {
  if (!['sale', 'scrap'].includes(kind)) fail('Выберите: в продажу или списать');
  const line = r.lines.find(l => l.productId === Number(productId));
  if (!line) fail('Товар отсутствует в возврате');
  const prior = await M.ReturnDisposition.findAll({
    where: {
      returnId: r.id,
      productId: line.productId
    },
    transaction: t
  });
  const held = round(line.kg - prior.reduce((s, p) => s + Number(p.kg), 0));
  if (kg > held + .00001) fail('На проверке осталось ' + held + ' кг');
  const disposition = await M.ReturnDisposition.create({
    returnId: r.id,
    productId: line.productId,
    kind,
    kg,
    actorId: u.id,
    actorName: u.name,
    note
  }, {
    transaction: t
  });
  await Product.findByPk(line.productId,{transaction:t,lock:t.LOCK.UPDATE});
  const stock = await M.Stock.findByPk(line.productId,{transaction:t,lock:t.LOCK.UPDATE});
  await require('./stockValueService').disposition(stock,r,disposition,t);
  if (kind === 'sale') await changeStock(line.productId, kg, t);
  return disposition;
}
async function visible(u, orders) {
  staff(u);
  const rows = await M.GoodsReturn.findAll({
    where: u.role === 'super_admin' ? {} : {
      orderId: {
        [Op.in]: orders.map(o => o.id)
      }
    },
    order: [['createdAt', 'DESC']]
  });
  const ids = rows.map(r => r.id);
  const [dispositions, settlements, events] = await Promise.all([M.ReturnDisposition.findAll({
    where: {
      returnId: ids
    },
    order: [['createdAt', 'ASC']]
  }), M.ReturnSettlement.findAll({
    where: {
      returnId: ids
    },
    order: [['createdAt', 'ASC']]
  }), M.ReturnEvent.findAll({
    where: {
      returnId: ids
    },
    order: [['createdAt', 'ASC']]
  })]);
  const credits = await M.CreditUse.findAll({
    where: {
      settlementId: settlements.map(s => s.id)
    },
    order: [['createdAt', 'ASC']]
  });
  return {
    returns: rows.map(r => ({
      ...r.get({
        plain: true
      }),
      dispositions: dispositions.filter(d => d.returnId === r.id),
      settlements: settlements.filter(s => s.returnId === r.id).map(s => ({
        ...s.get({
          plain: true
        }),
        ...(u.role === 'super_admin' ? {} : {
          reference: undefined
        }),
        uses: credits.filter(c => c.settlementId === s.id).map(c => ({
          ...c.get({
            plain: true
          }),
          ...(u.role === 'super_admin' ? {} : {
            reference: undefined
          })
        }))
      })),
      events: events.filter(e => e.returnId === r.id).map(e => u.role === 'super_admin' ? e.get({
        plain: true
      }) : {
        id: e.id,
        actorName: e.actorName,
        action: e.action,
        createdAt: e.createdAt
      })
    }))
  };
}
module.exports = {
  visible,
  async create(u, b) {
    staff(u);
    return db.transaction(async t => {
      const order = await orderFor(u, b.orderId, t);
      if (!Array.isArray(b.lines) || !b.lines.length || b.lines.length > 100) fail('Выберите возвращаемые товары');
      if (new Set(b.lines.map(l => Number(l.productId))).size !== b.lines.length) fail('Товар повторяется');
      const posted = await M.GoodsReturn.findAll({
        where: {
          orderId: order.id,
          status: 'posted'
        },
        transaction: t
      });
      const lines = b.lines.map(l => {
        const original = soldProduct(order,l.productId);
        if (!original) fail('Товара нет в исходной накладной');
        const kg = qty(l.kg),
          returned = posted.reduce((s, r) => s + r.lines.filter(x => x.productId === original.productId).reduce((a, x) => a + x.kg, 0), 0);
        if (kg > round(original.kg - returned) + .00001) fail('Возвращают больше проданного остатка: ' + original.name);
        return {
          productId: original.productId,
          name: original.name,
          kg,
          price: Number(original.price),
          amount: money(money((returned + kg) * Number(original.price)) - posted.reduce((s, r) => s + r.lines.filter(x => x.productId === original.productId).reduce((a, x) => a + Number(x.amount), 0), 0))
        };
      });
      const replacements = [];
      if (b.replacements != null) {
        if (!Array.isArray(b.replacements) || b.replacements.length > 100) fail('Некорректные товары на обмен');
        if (new Set(b.replacements.map(l => Number(l.productId))).size !== b.replacements.length) fail('Товар на обмен повторяется');
        for (const l of b.replacements) {
          if (!Number.isSafeInteger(Number(l.productId)) || Number(l.productId) <= 0) fail('Выберите товар на обмен');
          const p = required(await Product.findByPk(Number(l.productId), {
            transaction: t
          }), 'Товар на обмен');
          if (!p.is_active) fail('Товар на обмен в архиве');
          const variant=await M.PackagingVariant.findByPk(p.id,{transaction:t});
          if(variant)require('./packagingService').quantity(variant,{kg:l.kg});
          replacements.push({
            productId: p.id,
            name: p.name,
            kg: qty(l.kg)
          });
        }
      }
      if (!['refund', 'debt', 'credit'].includes(b.preferredSettlement)) fail('Выберите способ расчёта');
      const r = await M.GoodsReturn.create({
        orderId: order.id,
        createdBy: u.id,
        createdByName: u.name,
        contactName: text(b.contactName, 'имя и фамилию клиента'),
        reason: text(b.reason, 'причину возврата', 2000),
        preferredSettlement: b.preferredSettlement,
        customer: await customerFor(order, t),
        lines,
        replacements,
        total: money(lines.reduce((s, l) => s + l.amount, 0))
      }, {
        transaction: t
      });
      await event(u, r, 'requested', null, snapshot(r), r.reason, t);
      return r;
    });
  },
  async cancel(u, id, b) {
    return db.transaction(async t => {
      const r = await returnFor(u, id, t);
      if (r.status !== 'requested') fail('Можно отменить только запрос на проверке');
      if (u.role !== 'super_admin' && r.createdBy !== u.id) throw ApiError.forbiddenRequest();
      const before = snapshot(r);
      await r.update({
        status: u.role === 'super_admin' ? 'rejected' : 'cancelled'
      }, {
        transaction: t
      });
      await event(u, r, r.status, before, snapshot(r), text(b.reason, 'причину отмены', 2000), t);
      return r;
    });
  },
  async post(u, id, b) {
    admin(u);
    return db.transaction(async t => {
      const r = await returnFor(u, id, t);
      if (r.status !== 'requested') fail('Запрос уже обработан');
      if (b.received !== true) fail('Подтвердите фактическое получение товара');
      const original = await orderFor(u, r.orderId, t),
        posted = await M.GoodsReturn.findAll({
          where: {
            orderId: r.orderId,
            status: 'posted'
          },
          transaction: t
        });
      for (const line of r.lines) {
        const sold = soldProduct(original,line.productId);
        const returned = posted.reduce((s, d) => s + d.lines.filter(l => l.productId === line.productId).reduce((a, l) => a + l.kg, 0), 0);
        if (!sold || round(returned + line.kg) > Number(sold.kg) + .00001) fail('По этой накладной уже оформлен возврат: ' + line.name);
        const alreadyAmount = posted.reduce((s, d) => s + d.lines.filter(l => l.productId === line.productId).reduce((a, l) => a + Number(l.amount), 0), 0);
        if (Math.abs(money(money((returned + line.kg) * Number(sold.price)) - alreadyAmount) - Number(line.amount)) > .001) throw new ApiError(409, 'Сумма изменилась после другого возврата. Отмените запрос и создайте его заново');
      }
      if (!Array.isArray(b.decisions) || b.decisions.length !== r.lines.length || new Set(b.decisions.map(d => Number(d.productId))).size !== r.lines.length) fail('Укажите решение по каждому товару');
      for (const l of r.lines) {
        const d = b.decisions.find(d => Number(d.productId) === l.productId);
        if (!d || !['sale', 'inspection', 'scrap'].includes(d.kind)) fail('Выберите состояние: ' + l.name);
      }
      // Lock all product rows in the same order as shipment operations; the API's
      // idempotency transaction includes the return and replacement shipment.
      for (const productId of [...new Set([...r.lines, ...r.replacements].map(l => l.productId))].sort((a, b) => a - b)) {
        await Product.findByPk(productId, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        await M.Stock.findByPk(productId, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });
      }
      const before = snapshot(r);
      await require('./stockValueService').acceptReturn(r,t);
      for (const l of r.lines) {
        const d = b.decisions.find(d => Number(d.productId) === l.productId);
        if (d.kind !== 'inspection') await allocate(u, r, l.productId, d.kind, l.kg, r.reason, t);
      }
      let exchangeOrderId = null;
      if (r.replacements.length) {
        const replacementId = require('crypto').randomUUID();
        if (!Array.isArray(b.prices) || b.prices.length !== r.replacements.length) fail('Укажите цены товаров на обмен');
        const lines = [];
        for (const [i, l] of r.replacements.entries()) {
          const price = Number(b.prices[i]);
          if (b.prices[i] === '' || b.prices[i] == null || !Number.isFinite(price) || price < 0 || price > 1e8 || Math.abs(price - money(price)) > 1e-8) fail('Некорректная цена товара на обмен');
          const stock = await M.Stock.findByPk(l.productId,{transaction:t,lock:t.LOCK.UPDATE});
          const fulfilment=await require('./legacyShipmentService').consume(l,b.shipmentPacks?.[i]??[],stock,t,{unpack:b.shipmentUnpack?.[i]===true});
          await require('./stockValueService').shipment(stock,replacementId,Number(l.kg),t);
          const p = await changeStock(l.productId, -l.kg, t);
          lines.push({
            ...l,
            ...fulfilment,
            name: p.name,
            price
          });
        }
        const order = await M.Order.create({
          id: replacementId,
          userId: original.userId,
          company: original.company,
          status: 'shipped',
          lines,
          total: money(lines.reduce((s, l) => s + money(l.kg * l.price), 0)),
          deliveryDate: new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Qyzylorda'
          }).format(new Date()),
          shippedAt: new Date(),
          note: 'Обмен по возврату № ' + r.id.slice(0, 8)
        }, {
          transaction: t
        });
        exchangeOrderId = order.id;
        const dest = await M.Destination.findByPk(original.id, {
          transaction: t
        });
        if (dest) await M.Destination.create({
          ...dest.get({
            plain: true
          }),
          orderId: order.id,
          createdAt: undefined,
          updatedAt: undefined
        }, {
          transaction: t
        });
        const [relation] = await BusinessRelation.findOrCreate({
          where: {
            name: order.company,
            category: 'clients'
          },
          transaction: t
        });
        for (const l of lines) {
          const p = await Product.findByPk(l.productId, {
            transaction: t
          });
          const income = await Income.create({
            businessRelationId: relation.id,
            productId: p.id,
            weight: p.weight,
            totalWeight: l.kg,
            quantity: round(l.kg / Number(p.weight)),
            unitPrice: l.price,
            totalAmount: money(l.kg * l.price),
            date: new Date()
          }, {
            transaction: t
          });
          await M.LegacyLink.create({
            id: `shipment:${order.id}:${l.productId}`,
            data: {
              incomeId: income.id
            }
          }, {
            transaction: t
          });
        }
      }
      await r.update({
        status: 'posted',
        postedBy: u.id,
        postedByName: u.name,
        postedAt: new Date(),
        exchangeOrderId
      }, {
        transaction: t
      });
      await event(u, r, r.replacements.length ? 'exchange_posted' : 'posted', before, {
        ...snapshot(r),
        decisions: b.decisions
      }, r.reason, t);
      await require('./dailyPayService').forDate(require('./businessDay').day(r.postedAt),u,t);
      return r;
    });
  },
  async resolve(u, id, b) {
    admin(u);
    return db.transaction(async t => {
      const r = await returnFor(u, id, t);
      if (r.status !== 'posted') fail('Сначала подтвердите приём возврата');
      const row = await allocate(u, r, Number(b.productId), b.kind, qty(b.kg), text(b.reason, 'решение после проверки', 2000), t);
      await event(u, r, 'inspection_resolved', null, snapshot(row), row.note, t);
      return row;
    });
  },
  async settle(u, id, b) {
    admin(u);
    return db.transaction(async t => {
      const r = await returnFor(u, id, t);
      if (r.status !== 'posted') fail('Сначала проведите возврат');
      if (b.confirmed !== true) fail('Подтвердите фактический расчёт');
      if (!['refund', 'debt', 'credit'].includes(b.kind)) fail('Выберите способ расчёта');
      const value = amount(b.amount),
        settlements = await M.ReturnSettlement.findAll({
          where: {
            returnId: r.id
          },
          transaction: t
        });
      const available = money(Number(r.total) - settlements.reduce((s, l) => s + Number(l.amount), 0));
      if (value > available + .001) fail('Осталось к расчёту ' + available + ' ₸');
      let outcomeId = null;
      const reference = text(b.reference, 'основание или подтверждение расчёта');
      if(b.kind==='debt'){await orderFor(u,r.orderId,t);if(value>await require('./tradeFinanceService').availableForOrder(r.orderId,t)+.001)fail('Уменьшение долга превышает неоплаченный остаток накладной');}
      if (b.kind === 'refund') {
        const [category] = await OutcomeCategory.findOrCreate({
          where: {
            name: 'Возврат покупателю'
          },
          transaction: t
        });
        const o = await Outcome.create({
          recipient: r.customer.company,
          name: 'Возврат денег · ' + r.id.slice(0, 8),
          unitPrice: value,
          quantity: 1,
          totalAmount: value,
          date: new Date(),
          outcomeCategoryId: category.id
        }, {
          transaction: t
        });
        outcomeId = o.id;
        if(b.method||b.accountId)await require('./moneyService').assign('outcome:'+o.id,b,u,t);
      }
      const row = await M.ReturnSettlement.create({
        returnId: r.id,
        kind: b.kind,
        amount: value,
        actorId: u.id,
        actorName: u.name,
        reference,
        outcomeId
      }, {
        transaction: t
      });
      await event(u, r, 'settled', null, snapshot(row), reference, t);
      return row;
    });
  },
  async applyCredit(u, id, b) {
    admin(u);
    return db.transaction(async t => {
      const credit = required(await get(M.ReturnSettlement, id, t), 'Зачёт');
      if (credit.kind !== 'credit') fail('Это не кредит следующей поставки');
      const r = await returnFor(u, credit.returnId, t),
        order = await orderFor(u, b.orderId, t),
        customer = await customerFor(order, t);
      if (order.id !== r.exchangeOrderId && (!order.shippedAt || new Date(order.shippedAt) < new Date(r.postedAt))) fail('Выберите следующую отгрузку после возврата');
      if (customer.scopeKey !== r.customer.scopeKey) fail('Зачёт доступен только тому же клиенту / магазину');
      if (b.confirmed !== true) fail('Подтвердите зачёт оплаты');
      const value = amount(b.amount),
        used = await M.CreditUse.findAll({
          where: {
            settlementId: credit.id
          },
          transaction: t
        });
      if (value > money(Number(credit.amount) - used.reduce((s, a) => s + Number(a.amount), 0)) + .001) fail('Недостаточно доступного зачёта');
      const applied = await M.CreditUse.findAll({
          where: {
            orderId: order.id
          },
          transaction: t
        }),
        returns = await M.GoodsReturn.findAll({
          where: {
            orderId: order.id,
            status: 'posted'
          },
          transaction: t
        });
      const invoice = money(Number(order.total) - returns.reduce((s, r) => s + Number(r.total), 0) - applied.reduce((s, r) => s + Number(r.amount), 0));
      if (value > Math.min(invoice,await require('./tradeFinanceService').availableForOrder(order.id,t)) + .001) fail('Зачёт превышает сумму накладной после возвратов');
      const row = await M.CreditUse.create({
        settlementId: credit.id,
        orderId: order.id,
        amount: value,
        actorId: u.id,
        actorName: u.name,
        reference: text(b.reference, 'подтверждение зачёта')
      }, {
        transaction: t
      });
      await event(u, r, 'credit_applied', null, snapshot(row), row.reference, t);
      return row;
    });
  }
};
