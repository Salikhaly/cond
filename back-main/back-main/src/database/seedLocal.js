const bcrypt = require('bcrypt');
const { User, Product } = require('../models/models');
const { Material, Receipt, Recipe, Stock, Profile } = require('../models/operations');
module.exports = async () => {
    if (process.env.LOCAL_DEMO !== 'true') return;
    for (const [email, name, role] of [
        ['admin@local.test', 'Администратор', 'super_admin'],
        ['worker@local.test', 'Айгуль · кондитер', 'employee'],
        ['firm@local.test', 'Представитель фирмы', 'representative']
    ]) {
        const [u] = await User.findOrCreate({ where: { email }, defaults: { name, role, password: await bcrypt.hash('Local2026!demo', 10), email_confirmed: new Date() } });
        if (role === 'representative') await Profile.findOrCreate({ where: { userId: u.id }, defaults: { company: 'Демо · Кофейня «Утро»' } });
    }
    if (await Material.count() || await Product.count()) return;
    const flour = await Material.create({ name: 'Мука пшеничная', unit: 'кг', quantity: 100, unitCost: 280 });
    const sugar = await Material.create({ name: 'Сахар', unit: 'кг', quantity: 50, unitCost: 420 });
    const butter = await Material.create({ name: 'Масло сливочное', unit: 'кг', quantity: 30, unitCost: 3200 });
    const boxes = await Material.create({ name: 'Коробка для печенья', unit: 'шт', quantity: 100, unitCost: 120 });
    for (const m of [flour, sugar, butter, boxes]) await Receipt.create({ materialId: m.id, quantity: m.quantity, unitCost: m.unitCost, supplier: 'Демо-поставщик', document: 'НАЧАЛЬНЫЙ-ОСТАТОК', date: '2026-10-22' });
    const product = await Product.create({ name: 'Печенье сливочное', ingredients: [], additional: [], weight: 2, quantity: 0, weightTotal: 0, priceTotal: 0, priceForEmployee: 150 });
    await Stock.create({ productId: product.id });
    await Recipe.create({ productId: product.id, outputKg: 10, overhead: 500, lines: [
        { materialId: flour.id, quantity: 6 }, { materialId: sugar.id, quantity: 2 }, { materialId: butter.id, quantity: 3 }, { materialId: boxes.id, quantity: 5 }
    ] });
};
