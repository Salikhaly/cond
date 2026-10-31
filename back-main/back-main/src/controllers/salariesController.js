const ApiError = require("../exceptions/ApiError")
const salariesService = require('../services/salariesService')
const userService = require('../services/userService')
const {validationResult} = require('express-validator')

class SalariesController {

    async create(req, res, next) {
        try {
            const { userId } = req.params

            const salary = await salariesService.create(userId);

            return res.json(salary);
        } catch(e) {
            next(e)
        }
    }

    async getOne(req, res, next) {
        try {
            const { salaryId } = req.params

            const salary = await salariesService.getOne(salaryId);
            return res.json(salary);
        } catch(e) {
            next(e)
        }
    }

    async getAll(req, res, next) {
        try {
            const { userId } = req.params

            const salaries = await salariesService.getAll(userId);
            return res.json(salaries);
        } catch(e) {
            next(e)
        }
    }

    async delete(req, res, next) {
        try {
            const { salaryId } = req.params;

            const deleted = await salariesService.delete(salaryId);
            return res.json(deleted);
        } catch(e) {
            next(e)
        }
    }

    async update(req, res, next) {
        try {
            const { salaryId } = req.params;
            const { amount } = req.body; // data for updating

            const salary = await salariesService.update(salaryId, amount);
            return res.json(salary);
        } catch(e) {
            next(e)
        }
    }






    //
    // async getOneReport(req, res, next) {
    //     try {
    //         const reportId = req.params.id;
    //
    //         const product = await reportsService.getOne(reportId);
    //
    //         // console.log('\n\n\n', req.user,'\n\n\n')
    //         return res.json(product);
    //     } catch(e) {
    //         next(e)
    //     }
    // }

    async createAdvance(req, res, next) {
        // productId, businessRelationId, price
        try {
            const { salaryId } = req.params;
            const { amount, payment_type } = req.body;

            const advance = await salariesService.createAdvance(salaryId, amount, payment_type);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(advance);
        } catch(e) {
            next(e)
        }


    }

    async getAdvances(req, res, next) {
        // productId, businessRelationId, price
        try {
            const { salaryId } = req.params;

            const advances = await salariesService.getAdvances(salaryId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(advances);
        } catch(e) {
            next(e)
        }


    }

    async updateAdvance(req, res, next) {
        // productId, businessRelationId, price
        try {
            const { advanceId } = req.params;
            const { amount, payment_type } = req.body

            const advance = await salariesService.updateAdvance(advanceId, amount, payment_type);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(advance);
        } catch(e) {
            next(e)
        }


    }

    async deleteAdvance(req, res, next) {
        // productId, businessRelationId, price
        try {
            const { advanceId } = req.params;

            const advance = await salariesService.deleteAdvance(advanceId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(advance);
        } catch(e) {
            next(e)
        }


    }

}

module.exports = new SalariesController()