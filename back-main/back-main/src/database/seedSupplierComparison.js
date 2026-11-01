const {User} = require('../models/models');
const M = require('../models/operations');
const {State} = require('../models/sync');
const service = require('../services/operationsService');

const marker = 'demo:supplier-comparison:v1';

const samples = [
    ['Мука пшеничная', 'Мука · Опт', 'СРАВН-МУКА-1', '2026-10-29', {count: 1, size: 50, price: 12500, unit: 'мешок'}],
    ['Мука пшеничная', 'Мельница', 'СРАВН-МУКА-2', '2026-10-30', {count: 1, size: 25, price: 6750, unit: 'мешок'}],
    ['Сахар', 'Сахар · Опт', 'СРАВН-САХАР-1', '2026-10-29', {count: 1, size: 50, price: 20000, unit: 'мешок'}],
    ['Сахар', 'Бакалея', 'СРАВН-САХАР-2', '2026-10-30', {count: 1, size: 25, price: 10500, unit: 'мешок'}],
    ['Масло сливочное', 'Молочный', 'СРАВН-МАСЛО-1', '2026-10-29', {count: 1, size: 10, price: 30000, unit: 'коробка'}],
    ['Масло сливочное', 'Масло · Опт', 'СРАВН-МАСЛО-2', '2026-10-30', {count: 1, size: 5, price: 15750, unit: 'коробка'}],
    ['Коробка для печенья', 'Упак · 360', 'СРАВН-КОРОБКА-1', '2026-10-29', {count: 1, size: 360, price: 39600, unit: 'коробка'}],
    ['Коробка для печенья', 'Упак · 240', 'СРАВН-КОРОБКА-2', '2026-10-30', {count: 1, size: 240, price: 28800, unit: 'коробка'}],
];

async function apply() {
    if (await State.findByPk(marker)) return;
    const admin = await User.findOne({where: {email: 'admin@demo.test'}});
    if (!admin) return;
    for (const [materialName, supplier, document, date, pack] of samples) {
        const material = await M.Material.findOne({where: {name: materialName}});
        if (!material) continue;
        const exists = await M.ReceiptDocument.findOne({where: {document}});
        if (exists) continue;
        await service.receipt(admin, {
            date,
            supplier,
            document,
            paid: false,
            lines: [{materialId: material.id, purchasePack: pack}],
        });
    }
    await State.findOrCreate({where: {key: marker}, defaults: {value: {version: 1}}});
}

module.exports = {apply, marker};
