const db = require('../database/sequelize');
const { Product } = require('../models/models');
const M = require('../models/operations');
const { State } = require('../models/sync');

const marker = 'schema:box-packs:v1';
const baseMarker = 'schema:box-packs:v2';
const baseCapacities = [2.5, 1.5, 1.1, 2];

const number = value => Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
const parseCapacity = name => {
    const match = String(name || '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*кг/i);
    return match ? Number(match[1]) : null;
};

async function ensure() {
    if (await State.findByPk(marker)) return;
    await db.transaction(async transaction => {
        const materials = await M.Material.findAll({ transaction });
        const boxes = new Map();
        const films = [];
        for (const material of materials) {
            const capacity = parseCapacity(material.name);
            const isBox = /короб/i.test(material.name);
            const isFilm = /плен|плён/i.test(material.name);
            if (isBox) {
                await material.update({ kind: 'box', capacityKg: material.capacityKg ?? capacity, unit: 'шт' }, { transaction });
                if (capacity) boxes.set(number(capacity), material);
            } else if (isFilm) {
                await material.update({ kind: 'film', unit: 'м' }, { transaction });
                films.push(material);
            }
        }

        const ensureBox = async capacity => {
            const key = number(capacity);
            if (boxes.has(key)) return boxes.get(key);
            const [material] = await M.Material.findOrCreate({
                where: { name: 'Коробка ' + String(capacity).replace('.', ',') + ' кг' },
                defaults: { unit: 'шт', kind: 'box', capacityKg: key, quantity: 0, unitCost: 0 },
                transaction,
            });
            await material.update({ kind: 'box', capacityKg: key, unit: 'шт' }, { transaction });
            boxes.set(key, material);
            return material;
        };

        for (const capacity of baseCapacities) await ensureBox(capacity);

        let film = films[0];
        if (!film) {
            [film] = await M.Material.findOrCreate({
                where: { name: 'Плёнка' },
                defaults: { unit: 'м', kind: 'film', quantity: 0, unitCost: 0 },
                transaction,
            });
        }
        await film.update({ kind: 'film', unit: 'м' }, { transaction });

        const products = await Product.findAll({ transaction });
        const selling = await M.SellingPrice.findAll({ transaction });
        const stocks = await M.Stock.findAll({ transaction });
        const clientPrices = await M.ClientPrice.findAll({ transaction });
        for (const product of products) {
            const capacity = Number(product.weight) > 0 ? Number(product.weight) : 1;
            const box = boxes.has(number(capacity)) ? boxes.get(number(capacity)) : await ensureBox(capacity);
            const sellingPrice = selling.find(row => row.productId === product.id)?.price;
            const [pack] = await M.ProductPack.findOrCreate({
                where: { productId: product.id, boxMaterialId: box.id },
                defaults: {
                    capacityKg: capacity,
                    filmQtyM: 0,
                    salePrice: sellingPrice == null ? null : number(Number(sellingPrice) * capacity),
                    laborPerBox: number(Number(product.priceForEmployee) * capacity),
                    overheadPerBox: 0,
                    active: product.is_active !== false,
                },
                transaction,
            });
            await M.PackStock.findOrCreate({ where: { packId: pack.id }, defaults: { boxes: 0, reservedBoxes: 0 }, transaction });
            const stock = stocks.find(row => row.productId === product.id);
            if (stock && Number(stock.kg) > 0) {
                const [packStock] = await M.PackStock.findOrCreate({ where: { packId: pack.id }, defaults: { boxes: 0, reservedBoxes: 0 }, transaction });
                if (Number(packStock.boxes) === 0) await packStock.update({ boxes: number(Number(stock.kg) / capacity) }, { transaction });
            }
            for (const old of clientPrices.filter(row => row.productId === product.id && row.packId == null)) {
                const exists = await M.ClientPrice.findOne({ where: { customerId: old.customerId, productId: product.id, packId: pack.id, startsOn: old.startsOn }, transaction });
                if (!exists) await M.ClientPrice.create({
                    customerId: old.customerId,
                    outletId: old.outletId,
                    productId: product.id,
                    packId: pack.id,
                    price: number(Number(old.price) * capacity),
                    startsOn: old.startsOn,
                    actorId: old.actorId,
                    actorName: old.actorName,
                }, { transaction });
            }
        }
        await State.findOrCreate({ where: { key: marker }, defaults: { value: { version: 1 } }, transaction });
    });
}

async function ensureBasePacks() {
    if (await State.findByPk(baseMarker)) return;
    await db.transaction(async transaction => {
        const products = await Product.findAll({ transaction });
        const recipes = await M.Recipe.findAll({ where: { active: true }, transaction });
        const selling = await M.SellingPrice.findAll({ transaction });
        const materials = await M.Material.findAll({ transaction });
        const boxes = materials.filter(m => m.kind === 'box');
        const ensureBox = async capacity => {
            let box = boxes.find(m => Number(m.capacityKg) === number(capacity));
            if (box) return box;
            [box] = await M.Material.findOrCreate({ where: { name: 'Коробка ' + String(capacity).replace('.', ',') + ' кг' }, defaults: { unit: 'шт', kind: 'box', capacityKg: capacity, quantity: 0, unitCost: 0 }, transaction });
            boxes.push(box);
            return box;
        };
        for (const product of products) {
            if (!recipes.some(recipe => Number(recipe.productId) === Number(product.id))) continue;
            const pricePerKg = selling.find(row => Number(row.productId) === Number(product.id))?.price;
            for (const capacity of baseCapacities) {
                const box = await ensureBox(capacity);
                const [pack] = await M.ProductPack.findOrCreate({
                    where: { productId: product.id, boxMaterialId: box.id },
                    defaults: {
                        capacityKg: capacity,
                        filmQtyM: 0,
                        salePrice: pricePerKg == null ? null : number(Number(pricePerKg) * capacity),
                        laborPerBox: number(Number(product.priceForEmployee) * capacity),
                        overheadPerBox: 0,
                        active: true,
                    },
                    transaction,
                });
                await M.PackStock.findOrCreate({ where: { packId: pack.id }, defaults: { boxes: 0, reservedBoxes: 0 }, transaction });
            }
        }
        await State.findOrCreate({ where: { key: baseMarker }, defaults: { value: { version: 1 } }, transaction });
    });
}

module.exports = { ensure, ensureBasePacks, marker, baseMarker };
