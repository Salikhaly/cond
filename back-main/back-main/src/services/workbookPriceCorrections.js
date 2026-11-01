const L = require('../models/models');
const M = require('../models/operations');

const latestPrices = {
    'Вафельные трубочки': 1260,
    'Розочки вафельный': 1310,
    'Ассорти вафельный': 1260,
    'Контейнер вафельный': 600,
    'Сочный': 1030,
    'Курабье большой': 1030,
    'Светофор': 990,
    'Ёжик': 1030,
    'Конф подлиза': 1150,
    'Подлиза с орехом': 1150,
    'Ак мираж в шоколаде': 1110,
    'Классика': 1110,
    'Прелесть': 1200,
    'Кольцо с орехом': 1050,
    'Сердечка': 1030,
    'Ракушки': 1110,
    'Планета': 990,
    'Арахисовая': 1150,
    'Колечко с орехом': 1110,
    'Колечко с повидлом': 1110,
    'День и ночь': 1150,
};

const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '');

const pricesByKey = new Map(Object.entries(latestPrices).map(([name, price]) => [normalize(name), price]));

async function apply() {
    const products = await L.Product.findAll();
    let updated = 0;
    for (const product of products) {
        const price = pricesByKey.get(normalize(product.name));
        if (price == null) continue;
        await M.SellingPrice.upsert({ productId: product.id, price });
        updated++;
    }
    await M.ProductDisplay.update(
        { description: 'Из учёта за февраль 2025. Состав в Excel не указан; остаток требует сверки.' },
        { where: { description: 'Из учёта за февраль 2025. Состав и текущий остаток требуют сверки.' } },
    );
    return { updated };
}

module.exports = { apply, latestPrices };
