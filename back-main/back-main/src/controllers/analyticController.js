const ApiError = require("../exceptions/ApiError")
const analyticService = require('../services/analyticService')
const {validationResult} = require('express-validator')

class AnalyticController {


    async getAnalytic(req, res, next) {
        try {
            const { date, dateFrom, dateTo, order } = req.query;


            const analytics = await analyticService.get({date, dateFrom, dateTo});

            return res.json(analytics);
        } catch(e) {
            next(e)
        }
    }

}

module.exports = new AnalyticController()