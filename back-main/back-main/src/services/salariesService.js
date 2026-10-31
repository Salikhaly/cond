const ApiError = require('../exceptions/ApiError');
const { Advance, Salary, User, Outcome} = require('../models/models')
const {Op} = require("sequelize");

class SalariesService {

    async create(userId) {

        const candidate = await User.findByPk(userId)

        if (!candidate) {
            throw ApiError.badRequest(`User with id ${userId} does not exist`);
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Определяем начало текущего месяца
        const startDate = new Date(year, month, 1, 0, 0, 0, 0); // Начало месяца: 2024-12-01T00:00:00.000

        // Определяем конец текущего месяца с миллисекундами
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Конец месяца: 2024-12-31T23:59:59.999

        const salary = await Salary.findOne({
            where: {
                userId,
                is_active: true,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            }
        })

        if (!salary) {
            const amount = 0;
            const date = new Date();
            const newSalary = await Salary.create({ userId, total_amount: amount, date })

            return newSalary;
            // throw ApiError.badRequest(`Salary with user id ${userId} not found`);
        }

        return salary;
    }

    // updateInCurrentMonth(userId) {
    //     const candidate = await User.findByPk(userId)
    //
    //     if (!candidate) {
    //         throw ApiError.badRequest(`User with id ${userId} does not exist`);
    //     }
    //
    //     const now = new Date();
    //     const year = now.getFullYear();
    //     const month = now.getMonth();
    //
    //     // Определяем начало и конец текущего месяца
    //     const startDate = new Date(year, month, 1);
    //     const endDate = new Date(year, month + 1, 0); // Последний день месяца
    // }

    async update(salaryId, amount) {

        const salary = await Salary.findOne({
            where: {
                id: salaryId,
                is_active: true
            }
        })

        if (!salary) {
            throw ApiError.badRequest(`Salary with id ${salaryId} does not exist`);
        }
        if (amount < 0) {
            throw ApiError.badRequest(`Salary amount must be > 0`);
        }

        salary.total_amount = amount

        if (!await salary.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Salary в бд');
        }

        return salary;
    }

    async delete(salaryId) {

        const salary = await salary.findOne({
            where: {
                id: salaryId,
                is_active: true
            }
        })

        if (!salary) {
            throw ApiError.badRequest(`salary with id ${salaryId} does not exist`);
        }

        salary.is_active = false
        if ( await salary.save() ) {
            return { "message": "Salary is set inactive successfully" }
        } else {
            throw ApiError.badRequest(`Salary with id ${salaryId} change status some error`);
        }
    }

    async getOne(salaryId) {

        const salary = await Salary.findByPk(salaryId)

        if (!salary) {
            throw ApiError.badRequest(`Salary with id ${salaryId} does not exist`)
        }


        return salary;
    }

    async getAll(userId) {
        const candidate = await User.findByPk(userId)

        if (!candidate) {
            throw ApiError.badRequest(`User with id ${userId} does not exist`);
        }

        const salaries = await Salary.findAll({
            where: {
                userId,
                is_active: true,
            }
        })

        if (!salaries) {
            return null;
            // throw ApiError.badRequest(`Salary with user id ${userId} not found`);
        }

        return salaries;
    }




    async createAdvance(salaryId, amount, payment_type) {

        const salary = await Salary.findByPk(salaryId)

        if (!salary) {
            throw ApiError.badRequest(`Salary with id ${salaryId} does not exist`);
        }
        if (amount < 0) {
            throw ApiError.badRequest(`Salary amount must be > 0`);
        }

        const diff = Number(salary.advanced_amount) + Number(amount)
        console.log('\n\n\n\n DIFFFFFFF',diff, ' amount:', amount, '\n\n\n\n')

        if (salary.total_amount - diff < 0) {
            throw ApiError.badRequest(`Ошибка при выдаче аванса: аванс не может быть больше доступной суммы зарплаты`);
        }

        salary.advanced_amount = diff
        await salary.save()

        const advance = await Advance.create({ salaryId, amount, payment_type })

        const user = await User.findByPk(salary.userId)

        const outcomeObj ={
            recipient: user.name,
            name: 'Аванс ' + user.name,
            unitPrice: amount,
            quantity: 1,
            totalAmount: amount,
            outcomeCategoryId: 1,
            date: new Date(),
            advanceId: advance.id
        }

        const outcome = await Outcome.create(outcomeObj)


        return advance;
    }


    async updateAdvance(advanceId, amount, payment_type) {

        const advance = await Advance.findByPk(advanceId)

        if (!advance) {
            throw ApiError.badRequest(`Advance with id ${advanceId} does not exist`);
        }
        if (amount < 0) {
            throw ApiError.badRequest(`Salary amount must be > 0`);
        }

        const salary = await Salary.findOne({where: {id: advance.salaryId}})

        const prev_diff = Number(salary.advanced_amount) - Number(advance.amount)
        const diff = Number(prev_diff) + Number(amount)
        console.log('\n\n\n\n DIFFFFFFF',diff, ' amount:', amount, '\n\n\n\n')

        if (salary.total_amount - diff < 0) {
            throw ApiError.badRequest(`Ошибка при выдаче аванса: аванс не может быть больше доступной суммы зарплаты`);
        }

        advance.amount = amount
        advance.payment_type = payment_type

        if (!await advance.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Advance в бд');
        }

        salary.advanced_amount = diff
        await salary.save()
        if (!await salary.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Salary в бд');
        }



        const outcome = await Outcome.findOne({ where: {advanceId: advance.id }})
        outcome.unitPrice = amount
        outcome.totalAmount = amount
        await outcome.save()

        return advance;
    }


    async deleteAdvance(advanceId) {
        const advance = await Advance.findByPk(advanceId)

        if (!advance) {
            throw ApiError.badRequest(`Advance with id ${advanceId} does not exist`);
        }

        const salary = await Salary.findOne({where: {id: advance.salaryId}})

        const prev_advanced_amount = salary.advanced_amount - advance.amount
        salary.advanced_amount = prev_advanced_amount
        if (!await salary.save()) {
            throw ApiError.forbiddenRequest('Ошибка при сохранении изменений Salary в бд');
        }

        if (await advance.destroy()) {
            return { "message": "Advance deleted successfully" }
        } else {
            throw ApiError.badRequest(`Advance id ${advanceId} not found`);
        }
    }

    async getAdvances(salaryId) {
        const salary = await Salary.findByPk(salaryId)

        if (!salary) {
            throw ApiError.badRequest(`Salary with id ${salaryId} does not exist`);
        }

        const advances = await Advance.findAll({where: {salaryId}})

        return advances;
    }


    //
    //
    // // order = DESC or ASC
    // async getAll({ date, dateRange, categoryId, order='DESC' }) {
    //     // Формируем условия для фильтрации
    //     const where = {};
    //
    //     // Фильтрация по одиночной дате
    //     if (date) {
    //         where.date = date;
    //     }
    //
    //     // Фильтрация по промежутку дат
    //     if (dateRange && dateRange.from && dateRange.to) {
    //         where.date = {
    //             [Op.between]: [dateRange.from, dateRange.to]
    //         };
    //     }
    //
    //     // Фильтрация по ID категории
    //     if (categoryId) {
    //         where.categoryId = categoryId;
    //     }
    //
    //     return await Outcome.findAll({
    //         order: [['date', order]],
    //         include: [{
    //             model: OutcomeCategory
    //         }]
    //     });
    // }
    //
    //
    //
    //
    // // outcome categories
    // async createOutcomeCategory(name) {
    //     if (!name) {
    //         throw ApiError.badRequest('Название категории обязательно');
    //     }
    //     const existing = await OutcomeCategory.findOne({ where: { name } });
    //     if (existing) {
    //         throw ApiError.badRequest('Категория с таким названием уже существует');
    //     }
    //     const category = await OutcomeCategory.create({ name });
    //     return category;
    // }
    //
    // async getAllCategories() {
    //
    //     return await OutcomeCategory.findAll({
    //         order: [['updatedAt', 'DESC']],
    //         where: {is_active: true}
    //     });
    // }
    //
    // async updateCategory(id, name) {
    //     if (!name) {
    //         throw ApiError.badRequest('Не прошла валидацию. Требуется название категории');
    //     }
    //     const category = await OutcomeCategory.findByPk(id);
    //     if (!category) {
    //         throw ApiError.badRequest('Такая категория не существует');
    //     }
    //     if (name) {
    //         category.name = name;
    //     }
    //     await category.save();
    //     return category;
    // }
    //
    // async deleteCategory(id) {
    //     const category = await OutcomeCategory.findByPk(id)
    //     if (!category) {
    //         throw ApiError.badRequest(`OutcomeCategory id ${id} not found`);
    //     }
    //
    //     category.is_active = false
    //     if ( await category.save() ) {
    //         return { "message": "OutcomeCategory is set inactive successfully" }
    //     } else {
    //         throw ApiError.badRequest(`OutcomeCategory id ${id} change status some error`);
    //     }
    // }
    //
    // async destroyCategory(id) {
    //     const deleted = await OutcomeCategory.destroy({where: {id}})
    //
    //     if (deleted) {
    //         return { "message": "OutcomeCategory deleted successfully" }
    //     } else {
    //         throw ApiError.badRequest(`OutcomeCategory id ${id} not found`);
    //     }
    // }
}

module.exports = new SalariesService()