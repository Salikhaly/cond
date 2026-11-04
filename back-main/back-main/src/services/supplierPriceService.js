const M = require('../models/operations');
const ApiError = require('../exceptions/ApiError');

const admin = user => { if (user.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор'); };
const number = (value, label, zero = false) => {
    const n = Number(value);
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(n) || (zero ? n < 0 : n <= 0)) throw ApiError.badRequest('Укажите ' + label);
    return Math.round((n + Number.EPSILON) * 10000) / 10000;
};

async function list(user, supplierId) {
    admin(user);
    return M.SupplierPrice.findAll({ where: supplierId ? { supplierId } : {}, order: [['createdAt', 'ASC']] });
}

async function save(user, body) {
    admin(user);
    const supplier = await M.Supplier.findByPk(body.supplierId);
    if (!supplier) throw ApiError.notFound('Поставщик не найден');
    const material = await M.Material.findByPk(body.materialId);
    if (!material) throw ApiError.notFound('Материал не найден');
    const values = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        materialId: material.id,
        pricePerUnit: number(body.pricePerUnit, 'цену за единицу', true),
        packSize: body.packSize == null || body.packSize === '' ? null : number(body.packSize, 'штук в коробке'),
        unit: material.unit,
        active: body.active !== false,
    };
    const [row, created] = await M.SupplierPrice.findOrCreate({ where: { supplierId: supplier.id, materialId: material.id }, defaults: values });
    if (!created) await row.update(values);
    return row;
}

async function remove(user, id) {
    admin(user);
    const row = await M.SupplierPrice.findByPk(id);
    if (!row) throw ApiError.notFound('Цена не найдена');
    await row.destroy();
    return { id };
}

module.exports = { list, save, remove };
