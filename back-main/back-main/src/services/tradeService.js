const db = require('../database/sequelize'),
  M = require('../models/operations'),
  {
    User,
    Product
  } = require('../models/models'),
  {
    Op
  } = require('sequelize'),
  ApiError = require('../exceptions/ApiError');
const admin = u => {
  if (u.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор');
};
const text = (v, label, optional = false, max = 250) => {
  if (optional && (v == null || v === '')) return '';
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw ApiError.badRequest('Укажите ' + label);
  return v.trim();
};
const integer = v => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw ApiError.badRequest('Некорректный номер');
  return n;
};
const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function visible(u, t) {
  const outlets = await M.Outlet.findAll({
    where: {
      active: true,
      ...(u.role === 'super_admin' ? {} : {
        representativeId: u.id
      })
    },
    order: [['name', 'ASC']],
    transaction: t
  });
  const ids = [...new Set(outlets.map(o => o.customerId))];
  const customers = await M.Customer.findAll({
    where: u.role === 'super_admin' ? {} : {
      id: ids
    },
    order: [['name', 'ASC']],
    transaction: t
  });
  return {
    outlets,
    customers
  };
}
async function destination(u, outletId, t) {
  if (!uuid(outletId)) throw ApiError.badRequest('Выберите магазин');
  const outlet = await M.Outlet.findByPk(outletId, {
    transaction: t,
    lock: t.LOCK.UPDATE
  });
  if (!outlet || !outlet.active) throw ApiError.notFound('Магазин не найден');
  if (u.role !== 'super_admin' && outlet.representativeId !== u.id) throw ApiError.forbiddenRequest('Магазин не закреплён за вами');
  const customer = await M.Customer.findByPk(outlet.customerId, {
    transaction: t
  });
  if (!customer) throw ApiError.notFound('Клиент не найден');
  return {
    outlet,
    customer
  };
}
async function outlet(u, b) {
  admin(u);
  return db.transaction(async t => {
    const rep = await User.findByPk(integer(b.representativeId), {
      transaction: t
    });
    if (!rep || rep.role !== 'representative') throw ApiError.badRequest('Выберите торгового представителя');
    if ((await M.Access.findByPk(rep.id, {
      transaction: t
    }))?.disabled) throw ApiError.badRequest('Доступ представителя закрыт');
    let customer;
    if (b.customerId) {
      if (!uuid(b.customerId)) throw ApiError.badRequest('Выберите клиента');
      customer = await M.Customer.findByPk(b.customerId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!customer) throw ApiError.notFound('Клиент не найден');
    } else {
      const name = text(b.customerName, 'название клиента');
      if (!['company', 'outlet'].includes(b.debtScope || 'company')) throw ApiError.badRequest('Выберите порядок расчётов');
      await db.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
        replacements: {
          key: 'customer:' + name.toLowerCase()
        },
        transaction: t
      });
      const found = await M.Customer.findOne({
        where: db.where(db.fn('lower', db.col('name')), name.toLowerCase()),
        transaction: t
      });
      if (found) throw ApiError.badRequest('Такой клиент уже есть. Выберите его из списка');
      customer = await M.Customer.create({
        name,
        debtScope: b.debtScope || 'company'
      }, {
        transaction: t
      });
    }
    const address = text(b.address, 'адрес магазина');
    const name = text(b.name, 'название магазина');
    if (await M.Outlet.findOne({
      where: {
        customerId: customer.id,
        name,
        address,
        active: true
      },
      transaction: t
    })) throw ApiError.badRequest('Этот магазин уже добавлен');
    return M.Outlet.create({
      customerId: customer.id,
      name,
      address,
      contact: text(b.contact, 'контакт', true),
      phone: text(b.phone, 'телефон', true, 40),
      representativeId: rep.id
    }, {
      transaction: t
    });
  });
}
async function assign(u, id, b) {
  admin(u);
  if (!uuid(id)) throw ApiError.badRequest('Магазин не найден');
  return db.transaction(async t => {
    const o = await M.Outlet.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!o) throw ApiError.notFound('Магазин не найден');
    const rep = await User.findByPk(integer(b.representativeId), {
      transaction: t
    });
    if (!rep || rep.role !== 'representative') throw ApiError.badRequest('Выберите представителя');
    if ((await M.Access.findByPk(rep.id, {
      transaction: t
    }))?.disabled) throw ApiError.badRequest('Доступ представителя закрыт');
    await o.update({
      representativeId: rep.id
    }, {
      transaction: t
    });
    return o;
  });
}
async function display(u, id, b) {
  admin(u);
  const product = await Product.findByPk(integer(id));
  if (!product || !product.is_active) throw ApiError.notFound('Товар не найден');
  const description = b.description === undefined ? undefined : text(b.description, 'описание', true, 1500);
  let photo = b.photo;
  if (photo !== undefined) {
    if (typeof photo !== 'string') throw ApiError.badRequest('Некорректное фото');
    if (photo) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);
      if (!match) throw ApiError.badRequest('Фото: JPG, PNG или WebP');
      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.length > 400000 || bytes.length < 24) throw ApiError.badRequest('Фото должно быть не больше 400 КБ');
      const ok = match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
      if (!ok) throw ApiError.badRequest('Не удалось прочитать фото');
    }
  }
  return db.transaction(async t => {
    const [card] = await M.ProductDisplay.findOrCreate({
      where: {
        productId: product.id
      },
      transaction: t
    });
    return card.update({
      ...(description === undefined ? {} : {
        description
      }),
      ...(photo !== undefined ? {
        photo
      } : {})
    }, {
      transaction: t
    });
  });
}
module.exports = {
  visible,
  destination,
  outlet,
  assign,
  display
};
