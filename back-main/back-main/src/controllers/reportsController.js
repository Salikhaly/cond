const ApiError = require("../exceptions/ApiError")
const reportsService = require('../services/reportsService')
const userService = require('../services/userService')
const {validationResult} = require('express-validator')

class ReportsController {

    async createReport(req, res, next) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return next(ApiError.badRequest('Validation errors', errors.array()))
            }

            // const {name, category} = req.body;
            console.log('\n\n\n',req.user.email,'\n\n\n')
            const userEmail = req.user.email
            const user = await userService.getUserByEmail(userEmail)

            // const relation = await relationsService.create(name, category);
            const report = await reportsService.create(user.id);


            return res.json(report);
        } catch(e) {
            next(e)
        }
    }

    async getAllForStatistic(req, res, next) {
        try {
            const { date, dateFrom, dateTo, order } = req.query;

            const reports = await reportsService.getReportsForStatistics({date, dateRange: {from: dateFrom, to:dateTo}});

            return res.json(reports);
        } catch(e) {
            next(e)
        }
    }

    async getReports(req, res, next) {
        try {
            const userEmail = req.user.email
            const user = await userService.getUserByEmail(userEmail)

            const { date, dateFrom, dateTo, order } = req.query;

            const reports = await reportsService.getAllByUserId({userId: user.id, date, dateRange: {from: dateFrom, to:dateTo}});
            return res.json(reports);
        } catch(e) {
            next(e)
        }
    }

    async getReportsByEmployee(req, res, next) {
        try {
            const employeeId = req.params.employeeId

            const { date, dateFrom, dateTo, order } = req.query;

            const relations = await reportsService.getAllByUserId({userId: employeeId, withToday: true, date, dateRange: {from: dateFrom, to:dateTo}});
            return res.json(relations);
        } catch(e) {
            next(e)
        }
    }


    // TODO endpoint delete user
    async deleteReport(req, res, next) {
        try {
            const reportId = req.params.id;

            const deleted = await reportsService.delete(reportId);
            return res.json(deleted);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint update user
    async updateReport(req, res, next) {
        try {
            const reportId = req.params.id;
            const {name} = req.body; // data for updating

            const relation = await reportsService.update(name, reportId);
            return res.json(relation);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint get one user
    async getOneReport(req, res, next) {
        try {
            const reportId = req.params.id;

            const product = await reportsService.getOne(reportId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }
    }

    async addProduct(req, res, next) {
        // productId, businessRelationId, price
        try {
            const reportId = req.params.id;
            const {productId, measure, quantity} = req.body;

            const product = await reportsService.addProduct(productId, reportId, measure, quantity);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

    async getAllProducts(req, res, next) {
        // productId, businessRelationId, price
        try {
            const reportId = req.params.id;

            const products = await reportsService.getProducts(reportId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(products);
        } catch(e) {
            next(e)
        }


    }

    async updateProductData(req, res, next) {
        // productId, businessRelationId, price
        try {
            const reportId = req.params.id;
            const productId = req.params.productId;
            const {measure, quantity} = req.body

            const product = await reportsService.updateProductData(reportId, productId, measure, quantity);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

    async deleteReportProduct(req, res, next) {
        // productId, businessRelationId, price
        try {
            const reportId = req.params.id;
            const productId = req.params.productId;

            const product = await reportsService.deleteProduct(reportId, productId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

}

module.exports = new ReportsController()