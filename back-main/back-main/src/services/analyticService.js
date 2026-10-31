const {Product} = require("../models/models")
const ApiError = require('../exceptions/ApiError');

class AnalyticService {


    async get({date, dateFrom, dateTo}) {

        return await Product.findAll({
            order: [['updatedAt', 'DESC']]
        })
    }


}

module.exports = new AnalyticService()