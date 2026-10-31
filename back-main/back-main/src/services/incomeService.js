const ApiError = require('../exceptions/ApiError');
const { Income, BusinessRelation, Product, BusinessRelationProducts} = require('../models/models')
const {Op} = require("sequelize");

class IncomeService {

    async create(clientId, productId, weight, quantity, date) {

        const client = await BusinessRelation.findByPk(clientId)
        if (!client) {
            throw ApiError.badRequest('Клиент не существует');
        }

        // const product = await Product.findByPk(productId)
        // if (!product) {
        //     throw ApiError.badRequest('Продукт не существует');
        // }

        const product = await Product.findByPk(productId)
        if (!product) {
            throw ApiError.badRequest('Продукт не существует');
        }

        const clientProduct = await BusinessRelationProducts.findOne({where:{productId, businessRelationId: client.id}})

        if (quantity < 0) {
            throw ApiError.badRequest('Income quantity must be >= 0');
        }

        if (weight < 0) {
            throw ApiError.badRequest('Income weight must be >= 0');
        }

        // console.log('\n\n\n unitPrice', unitPrice ,'\n\n\n')
        if (product.quantity < Number(quantity)) {
            const diff = quantity - product.quantity
            throw ApiError.badRequest(`Недостаточно товаров на складе: не хватает ${diff} шт`);
        }

        const totalWeight = product.weight * quantity;
        const totalAmount = clientProduct.price * totalWeight;
        product.quantity = product.quantity - quantity
        product.weightTotal = product.quantity * product.weight
        await product.save()

        const income = await Income.create({ businessRelationId: clientId, productId, weight: product.weight, totalWeight, unitPrice: clientProduct.price, quantity, totalAmount, date })

        return income;
    }

    async update(incomeId, weight, quantity, date) {

        const income = await Income.findByPk(incomeId)
        if (!income) {
            throw ApiError.badRequest(`Income id ${incomeId} not found`);
        }

        if (quantity < 0) {
            throw ApiError.badRequest('Income quantity must be >= 0');
        }

        if (weight < 0) {
            throw ApiError.badRequest('Income weight must be >= 0');
        }

        const product = await Product.findByPk(income.productId)
        if (!product) {
            throw ApiError.badRequest('Продукт не существует');
        }
        const prev_quantity = income.quantity - Number(quantity)
        const new_quantity = product.quantity + prev_quantity
        const diff_quantity = product.quantity - new_quantity
        if ( new_quantity < 0) {
            throw ApiError.badRequest(`Не хватает товара на складе: ${diff_quantity} шт`);
        }
        product.quantity = new_quantity
        product.weightTotal = product.quantity * product.weight
        await product.save()

        const totalWeight = product.weight * quantity;
        income.totalAmount = income.unitPrice * totalWeight
        income.totalWeight = totalWeight
        income.quantity = quantity
        income.weight = product.weight
        income.date = date


        if (!await income.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Income в бд');
        }

        return income;
    }

    async delete(id) {
        const income = await Income.findByPk(id)
        const product = await Product.findByPk(income.productId)

        product.quantity += income.quantity
        product.weightTotal = product.quantity * product.weight
        await product.save()
        const isDeleted = income.destroy()



        if (isDeleted) {
            return { "message": "Income deleted successfully" }
        } else {
            throw ApiError.badRequest(`Income id ${id} not found`);
        }
    }


    // order = DESC or ASC
    async getAll({ date, dateRange=[], order='DESC', clients=[], products=[] }) {
        // Формируем условия для фильтрации
        const where = {};

        // Фильтрация по одиночной дате
        if (date) {
            const targetDate = new Date(date)
            where.date = {
                [Op.gte]: new Date(targetDate.setHours(0, 0, 0, 0)), // Начало дня
                [Op.lt]: new Date(targetDate.setHours(23, 59, 59, 999)) // Конец дня
            };
        }

        // Фильтрация по промежутку дат
        if (dateRange && dateRange.from && dateRange.to) {
            const targetDateFrom = new Date(dateRange.from)
            const targetDateTo = new Date(dateRange.to)
            where.date = {
                [Op.gte]: new Date(targetDateFrom.setHours(0, 0, 0, 0)), // Начало дня
                [Op.lt]: new Date(targetDateTo.setHours(23, 59, 59, 999)) // Конец дня
            };
        }

        // Фильтрация по ID clients
        if (clients.length > 0) {
            where.businessRelationId = {
                [Op.in]: clients
            };
        }

        // Фильтрация по ID products
        if (products.length > 0) {
            where.productId = {
                [Op.in]: products
            };
        }

        console.log('\n\n\n FILTEEEEER', where, '\n\n\n\n')

        return await Income.findAll({
            order: [['createdAt', order]],
            where,
            include: [
                { model: Product },
                { model: BusinessRelation },
            ]
        });
    }



}

module.exports = new IncomeService()