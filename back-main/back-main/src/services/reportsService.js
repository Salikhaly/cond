const {Report, User, Product, ReportProducts, Salary} = require("../models/models")
const ApiError = require('../exceptions/ApiError');
const UserDto = require("../dtos/userDto");
const {Op} = require("sequelize");
const salaryService = require('./salariesService')

class ReportsService {

    async getTodayReport(userId) {
        const today  = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return await Report.findOne({
            where: {
                userId,
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow,
                    //Op.gte и Op.lt для поиска записей, у которых createdAt больше или равно today и меньше tomorrow.
                },
            },
        })
    }

    async create(userId) {

        const candidateReport = await this.getTodayReport(userId)
        if (candidateReport) {
            return candidateReport;
            // throw ApiError.badRequest(`Сегодняшний отчет уже создан`);
        }

        const report = await Report.create({userId})

        return {
            message: 'Report added successfully',
            report
        }


    }

    async getAllByUserId({userId, withToday = false, date, dateRange=[], order='DESC'}) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (withToday) {
            const where = {};

            // Фильтрация по одиночной дате
            if (date) {
                const targetDate = new Date(date)
                where.createdAt = {
                    [Op.gte]: new Date(targetDate.setHours(0, 0, 0, 0)), // Начало дня
                    [Op.lt]: new Date(targetDate.setHours(23, 59, 59, 999)) // Конец дня
                };
            }

            // Фильтрация по промежутку дат
            if (dateRange && dateRange.from && dateRange.to) {
                const targetDateFrom = new Date(dateRange.from)
                const targetDateTo = new Date(dateRange.to)
                where.createdAt = {
                    [Op.gte]: new Date(targetDateFrom.setHours(0, 0, 0, 0)), // Начало дня
                    [Op.lt]: new Date(targetDateTo.setHours(23, 59, 59, 999)) // Конец дня
                };
            }

            // Фильтрация по ID clients
            if (userId) {
                where.userId = userId
            }

            return await Report.findAll({
                where,
                order: [['createdAt', 'DESC']]
            })
        }

        return await Report.findAll({
            where: {
                [Op.or]: [
                    { createdAt: { [Op.lt]: today } }, // записи до сегодняшнего дня
                    // { createdAt: { [Op.gte]: tomorrow } }, // записи после сегодняшнего дня
                ],
                userId,
            },
            order: [['createdAt', 'DESC']]
        })
    }

    async getReportsForStatistics({date, dateRange=[], order='DESC'}) {
        const where = {};

        // Фильтрация по одиночной дате
        if (date) {
            const targetDate = new Date(date)
            where.createdAt = {
                [Op.gte]: new Date(targetDate.setHours(0, 0, 0, 0)), // Начало дня
                [Op.lt]: new Date(targetDate.setHours(23, 59, 59, 999)) // Конец дня
            };
        }

        // Фильтрация по промежутку дат
        if (dateRange && dateRange.from && dateRange.to) {
            const targetDateFrom = new Date(dateRange.from)
            const targetDateTo = new Date(dateRange.to)
            where.createdAt = {
                [Op.gte]: new Date(targetDateFrom.setHours(0, 0, 0, 0)), // Начало дня
                [Op.lt]: new Date(targetDateTo.setHours(23, 59, 59, 999)) // Конец дня
            };
        }

        return await Report.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: { model: User, attributes: ['id', 'name', 'email', 'role'] }
        })
    }

    async delete(id) {
        const deleted = await Report.destroy({where: {id}})

        if (deleted) {
            return { "message": "Report deleted successfully" }
        } else {
            throw ApiError.badRequest(`Report id ${id} not found`);
        }
    }

    async update(name, id) {
        const report = await Report.findOne({where: {id}})


        if (!report) {
            throw ApiError.badRequest(`Report with id ${id} not found`);
        }
        report.name = name
        if (!report.save()) {
            throw ApiError.badRequest(`Up to date Report name for this id ${id} does not saved`)
        }
        return {
            message: 'Report is successfully updated',
            report
        }
    }

    async getOne(id) {
        const report = await Report.findOne({where: {id}})
        if (!report) {
            throw ApiError.badRequest(`Report with this id ${id} does not exist`)
        }

        return report
    }

    async processTotalSalaryByCurrentMonthReport(userId) {const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Определяем начало текущего месяца
        const startDate = new Date(year, month, 1, 0, 0, 0, 0); // Начало месяца: 2024-12-01T00:00:00.000

        // Определяем конец текущего месяца с миллисекундами
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Конец месяца: 2024-12-31T23:59:59.999

        const reports = await Report.findAll({
            where: {
                userId,
                createdAt: {
                    [Op.gte]: startDate, // Начало месяца
                    [Op.lte]: endDate,   // Конец месяца
                },
            },
            attributes: ['id'], // Получаем только id отчётов, чтобы использовать их для поиска продуктов
        });

        console.log('\n\n REPORTS: ', reports, '\n\n')

        if (reports.length < 1) {
            return 0
        }

        const reportIds = reports.map(report => report.id); // Массив ID отчётов

        console.log('\n\n REPORTS ids: ', reportIds, '\n\n')

        // Получаем все продукты, которые входят в отчёты за текущий месяц
        const reportProducts = await ReportProducts.findAll({
            where: {
                reportId: {
                    [Op.in]: reportIds, // Фильтруем по reportId, которые принадлежат отчётам текущего месяца
                },
            },
            attributes: ['totalForSalary'], // Получаем только поле totalForSalary
        });

        console.log('\n\n REPORTS products: ', reportProducts, '\n\n')

        if (reportProducts.length < 1) {
            return 0
        }

        // Подсчитываем общую зарплату
        const totalSalary = reportProducts.reduce((sum, product) => sum + Number(product.totalForSalary), 0);

        console.log('\n\n REPORTS total salary: ', totalSalary, '\n\n')

        return totalSalary;

        // let totalMoney = 0
        // reportProducts.map( r => {
        //     totalMoney += Number(r.totalForSalary)
        // })
        // return totalMoney;
    }

    async processTotalWeight(reportId) {
        const reportProducts = await ReportProducts.findAll({where: {reportId}, include: {model: Product}})
        // console.log('\n\n\n !!!!! $$$$$ REPORTS TOTAL WEIGHT: ', 0, '\n\n\n')
        if (reportProducts.length < 1) {
            return 0
        }
        let totalWeights = 0
        reportProducts.map( rp => {
            if (rp.measure === 'piece') {
                const weight = Number(rp.quantity) * Number(rp.product.weight)
                totalWeights += Number(weight)
            } else {
                totalWeights += Number(rp.quantity)
            }
        })

        console.log('\n\n\nREPORTS TOTAL WEIGHT: ', totalWeights, '\n\n\n')
        return totalWeights;
    }


    async addProduct(productId, reportId, measure, quantity) {

        const product = await Product.findByPk(productId);
        const report = await Report.findByPk(reportId);
        const salary = await salaryService.create(report.userId)

        if (!product || !report) {
            throw new Error('Product или Report не найдены');
        }

        let totalMoney = 0;
        let totalWeights = 0;
        let productQuantity = 0;


        if (measure === 'piece') {
            productQuantity = Number(quantity)

            // for salary
            const weightByPieces = Number(quantity) * Number(product.weight) // кол-во штук * вес одной коробки
            totalMoney = Number(product.priceForEmployee) * Number(weightByPieces);

            totalWeights = weightByPieces

        } else {
            const quantity_from_kg = Number(quantity) / Number(product.weight) // quantity = кол-во килограмм
            productQuantity = Math.floor(Number(quantity_from_kg))

            totalWeights = Number(quantity)

            // for salary
            totalMoney = Number(product.priceForEmployee) * Number(quantity); // ставка за товар * изготовленный вес в кг
        }

        product.quantity += Number(productQuantity)
        product.weightTotal = Number(product.quantity) * product.weight
        await product.save()

        report.total = Number(report.total) + Number(totalWeights)
        await report.save()

        const res = await ReportProducts.create({
            productId: product.id,
            reportId: report.id,
            price: Number(product.priceForEmployee),
            totalForSalary: Number(totalMoney),
            measure,
            quantity
        });

        // salary processing
        salary.total_amount = await this.processTotalSalaryByCurrentMonthReport(report.userId)
        await salary.save()

        return {res}
    }

    async getProducts(reportId) {

        const reportProducts = await ReportProducts.findAll({where: {reportId: reportId},
            order: [['updatedAt', 'DESC']],
            include: [
                { model: Product },
            ]
        });

        // let res_products = []
        //
        // // Извлекаем productId и price из полученных записей
        // const productData = reportProducts.map(rp => ({
        //     productId: rp.productId,
        //     measure: rp.measure,
        //     quantity: rp.quantity,
        //     createdAt: rp.createdAt,
        //     price: rp.price,
        //     totalForSalary: rp.totalForSalary,
        // }));
        //
        // // Проверяем, есть ли productData для дальнейшего запроса
        // if (productData.length > 0) {
        //     // Получаем все продукты по найденным productId
        //     const products = await Product.findAll({
        //         where: {
        //             id: productData.map(pd => pd.productId), // Условие для получения продуктов
        //         },
        //     });
        //
        //     // Объединяем продукты с ценами
        //     res_products = products.map(product => {
        //         const matchedData = productData.find(pd => pd.productId === product.id);
        //
        //         return {
        //             id: product.id,
        //             name: product.name,
        //             image: product.image,
        //             ingredients: product.ingredients,
        //             price: Number(matchedData.price),
        //             totalForSalary: Number(matchedData.totalForSalary),
        //             measure: matchedData ? matchedData.measure : null, // Добавляем цену, если есть
        //             quantity: matchedData ? matchedData.quantity : null, // Добавляем цену, если есть
        //             createdAt: matchedData ? matchedData.createdAt : null, // Добавляем цену, если есть
        //         };
        //     });
        //     console.log(products); // Новый массив объектов с продуктами и ценами
        // } else {
        //     console.log('Нет продуктов для данного бизнес-отношения.');
        // }
        //
        //
        // return {products: res_products}
        return {products: reportProducts}
    }


    async updateProductData(reportId, productId, measure, quantity) {
        const today  = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        console.log('\n\n\n\n',reportId, productId, measure, quantity, '\n\n\n\n')

        const reportProduct = await ReportProducts.findOne({
            where: {
                reportId,
                productId,
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow,
                    //Op.gte и Op.lt для поиска записей, у которых createdAt больше или равно today и меньше tomorrow.
                },
            },
        });

        if (!reportProduct) {
            throw ApiError.badRequest(`reportProduct with reportId ${reportId} productId ${productId} not found`);
        }

        // product quantity update
        const product = await Product.findByPk(productId)
        let totalMoney = 0;
        if (measure === 'piece') {
            const prev_quantity = product.quantity - reportProduct.quantity
            product.quantity = prev_quantity + Number(quantity)

            // for salary
            const weightByPieces = Number(quantity) * Number(product.weight) // кол-во штук * вес одной коробки
            totalMoney = Number(product.priceForEmployee) * Number(weightByPieces);

            // product.weightTotal += Number(weightByPieces)
        } else {
            const prev_quantity_from_kg = Math.floor( (Number(reportProduct.quantity) / Number(product.weight)) )
            const new_quantity_from_kg = Math.floor( (Number(quantity) / Number(product.weight)) )

            const prev_quantity = product.quantity - prev_quantity_from_kg
            product.quantity = prev_quantity + Number(new_quantity_from_kg)

            // const diff_weight = quantity - reportProduct.quantity
            // product.weightTotal += Number(diff_weight)

            // for salary
            totalMoney = Number(product.priceForEmployee) * Number(quantity); // ставка за товар * изготовленный вес в кг
        }

        product.weightTotal = Number(product.quantity) * Number(product.weight)
        // const prev_quantity = product.quantity - reportProduct.quantity
        // product.quantity = prev_quantity + Number(quantity)

        // report
        // reportProduct.measure = measure
        reportProduct.quantity = quantity
        reportProduct.totalForSalary = totalMoney

        const saved = await reportProduct.save()
        if (!saved) {
            throw ApiError.badRequest(`Up to date Report name for this reportId ${reportId} productId ${productId} does not saved`)
        }

        await product.save()

        const report = await Report.findByPk(reportId)
        // salary processing
        const salary = await salaryService.create(report.userId)
        salary.total_amount = await this.processTotalSalaryByCurrentMonthReport(report.userId)
        await salary.save()

        // report total weight processing
        report.total = await this.processTotalWeight(reportId)
        await report.save()

        return {
            message: 'Report product price is successfully updated',
            reportProduct
        }

    }


    async deleteProduct(reportId, productId) {

        const deletedRelationProduct = await ReportProducts.findOne(
            {where: {reportId: Number(reportId), productId: Number(productId)},
        });

        const report_product_quantity = deletedRelationProduct.quantity
        const measure = deletedRelationProduct.measure

        const isDeleted = await deletedRelationProduct.destroy()

        console.log('REPORT PRODUCT DELETION: report id', reportId, ', product id', productId, ', status: ', isDeleted)

        if ( isDeleted ) {

            // salary processing
            const report = await Report.findByPk(reportId)
            const salary = await salaryService.create(report.userId)

            // salary recalculate
            salary.total_amount = await this.processTotalSalaryByCurrentMonthReport(report.userId)
            await salary.save()

            // report total weight recalculate
            report.total = await this.processTotalWeight(reportId)
            await report.save()

            // products quantity recalculating (пересчет кол-во на складе)
            const product = await Product.findByPk(productId)
            if (measure === 'piece') {
                product.quantity -= Number(report_product_quantity)

                // const weightByPieces = Number(report_product_quantity) * Number(product.weight)
                // product.weightTotal -= Number(weightByPieces)
            } else {
                const prev_quantity_from_kg = Math.floor( (Number(report_product_quantity) / Number(product.weight)) )
                product.quantity -= prev_quantity_from_kg

                // product.weightTotal -= Number(report_product_quantity)

            }
            product.weightTotal = Number(product.quantity) * Number(product.weight)

            await product.save()

            return { "message": "Report Product deleted successfully" }
        } else {
            throw ApiError.badRequest(`Report Product reportId ${reportId} productId ${productId} not found`);
        }

    }


}

module.exports = new ReportsService()
