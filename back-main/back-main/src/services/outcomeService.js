const ApiError = require('../exceptions/ApiError');
const { OutcomeCategory, Outcome, Advance} = require('../models/models')
const {Op} = require("sequelize");

class OutcomeService {

    async create(recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date) {

        const categoryCandidate = await OutcomeCategory.findByPk(outcomeCategoryId)

        if (!categoryCandidate) {
            throw ApiError.badRequest('Категория не существует');
        }

        console.log('\n\n\n unitPrice', unitPrice ,'\n\n\n')

        const totalAmount = unitPrice * quantity;

        const outcome = await Outcome.create({ recipient, businessRelationId: supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, totalAmount, date })

        return outcome;
    }

    async update(outcomeId, recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date) {

        const categoryCandidate = await OutcomeCategory.findByPk(outcomeCategoryId)

        if (!categoryCandidate) {
            throw ApiError.badRequest('Категория не существует');
        }

        if (quantity < 0) {
            throw ApiError.badRequest('Outcome quantity must be > 0');
        }
        if (unitPrice < 0) {
            throw ApiError.badRequest('Outcome quantity must be > 0');
        }
        if (weight < 0) {
            throw ApiError.badRequest('Outcome quantity must be > 0');
        }

        const outcome = await Outcome.findByPk(outcomeId)
        outcome.recipient = recipient
        outcome.name = name
        outcome.weight = weight
        outcome.unitPrice = unitPrice
        outcome.quantity = quantity
        outcome.outcomeCategoryId = outcomeCategoryId
        outcome.date = date
        outcome.totalAmount = unitPrice * quantity

        if (!await outcome.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Outcome в бд');
        }

        return outcome;
    }

    async delete(id) {
        const deleted = await Outcome.destroy({where: {id}})

        if (deleted) {
            return { "message": "Outcome deleted successfully" }
        } else {
            throw ApiError.badRequest(`Outcome id ${id} not found`);
        }
    }


    // order = DESC or ASC
    async getAll({ date, dateRange, categories=[], order='DESC' }) {
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

        // Фильтрация по ID категории
        if (categories.length > 0) {
            where.outcomeCategoryId = {
                [Op.in]: categories
            };
        }

        console.log('\n\n\n FILTEEEEER', where, '\n\n\n\n')

        const records = await Outcome.findAll({
            order: [['date', order]],
            where,
            include: [{
                model: OutcomeCategory,
            }, {
                model: Advance
            }]
        });
        console.log('############\n\n\n\n', 'OUTCOME ALL GET', records, '\n\n\n\n')

        return records
    }




    // outcome categories
    async createOutcomeCategory(name) {
        if (!name) {
            throw ApiError.badRequest('Название категории обязательно');
        }
        const existing = await OutcomeCategory.findOne({ where: { name } });
        if (existing) {
            throw ApiError.badRequest('Категория с таким названием уже существует');
        }
        const category = await OutcomeCategory.create({ name });
        return category;
    }

    async getAllCategories() {

        return await OutcomeCategory.findAll({
            order: [['updatedAt', 'DESC']],
            where: {is_active: true}
        });
    }

    async updateCategory(id, name) {
        if (!name) {
            throw ApiError.badRequest('Не прошла валидацию. Требуется название категории');
        }
        const category = await OutcomeCategory.findByPk(id);
        if (!category) {
            throw ApiError.badRequest('Такая категория не существует');
        }
        if (name) {
            category.name = name;
        }
        await category.save();
        return category;
    }

    async deleteCategory(id) {
        const category = await OutcomeCategory.findByPk(id)
        if (!category) {
            throw ApiError.badRequest(`OutcomeCategory id ${id} not found`);
        }

        category.is_active = false
        if ( await category.save() ) {
            return { "message": "OutcomeCategory is set inactive successfully" }
        } else {
            throw ApiError.badRequest(`OutcomeCategory id ${id} change status some error`);
        }
    }

    async destroyCategory(id) {
        const deleted = await OutcomeCategory.destroy({where: {id}})

        if (deleted) {
            return { "message": "OutcomeCategory deleted successfully" }
        } else {
            throw ApiError.badRequest(`OutcomeCategory id ${id} not found`);
        }
    }
}

module.exports = new OutcomeService()