const {Product} = require("../models/models")
const ApiError = require('../exceptions/ApiError');

class ProductService {

    async create(name, quantity, ingredients, weight, priceForEmployee, additional, image) {
        const jsonIngredients = JSON.parse(ingredients)

        let totalPrice = 0
        let weights = 0
        jsonIngredients.map (i => {
            const price = Number(i.weight) * Number(i.price)
            totalPrice += price
            weights += Number(i.weight)
        })
        const jsonAdditional = JSON.parse(additional)
        jsonAdditional.map (i => {
            // const price = Number(i.weight) * Number(i.price)
            totalPrice += Number(i.price)
        })

        let productTotalPrice = 0;
        if (totalPrice !== 0 || weights !== 0) {
            // productTotalPrice = totalPrice / weights
            productTotalPrice = totalPrice
        }

        const totalWeight = weight * quantity

        const product = await Product.create({name, quantity, ingredients: jsonIngredients, priceForEmployee, additional: jsonAdditional, weightTotal: totalWeight, weight, priceTotal: productTotalPrice, image})

        // upload image

        return {
            message: 'Product added successfully',
            product
        }


    }

    async getAll() {

        return await Product.findAll({
            order: [['updatedAt', 'DESC']],
            where: {is_active: true}
        })
    }

    async delete(id) {
        const product = await Product.findByPk(id)

        product.is_active = false
        const is_deleted = await product.save()
        // delete image

        if (is_deleted) {
            return { "message": "Product deleted successfully" }
        } else {
            throw ApiError.badRequest(`Ошибка при удалении: не сохранились изменения. Product with id ${id}`);
        }
    }

    async destroy(id) {
        const deleted = await Product.destroy({where: {id}})

        // delete image

        if (deleted) {
            return { "message": "Product deleted successfully" }
        } else {
            throw ApiError.badRequest(`Product id ${id} not found`);
        }
    }

    async update({id, name, quantity, ingredients, priceForEmployee, additional, weight, image}) {
        const product = await Product.findOne({where: {id}})
        if (!product) {
            throw ApiError.badRequest(`Product with id ${id} not found`);
        }

        const jsonIngredients = JSON.parse(ingredients)

        product.name = name
        product.priceForEmployee = priceForEmployee
        product.ingredients = jsonIngredients
        product.quantity = quantity
        product.weight = weight
        if (image) {
            product.image = image
        }

        let totalPrice = 0
        let totalWeight = 0
        jsonIngredients.map (i => {
            const price = Number(i.weight) * Number(i.price)
            totalPrice += price
            totalWeight += Number(i.weight)
        })
        const jsonAdditional = JSON.parse(additional)
        jsonAdditional.map (i => {
            // const price = Number(i.weight) * Number(i.price)
            totalPrice += Number(i.price)
        })

        let productTotalPrice = 0;
        if (totalPrice !== 0 || totalWeight !== 0) {
            // productTotalPrice = totalPrice / totalWeight
            productTotalPrice = totalPrice
        }
        product.priceTotal = productTotalPrice

        product.weightTotal = weight * quantity
        product.additional = jsonAdditional

        // edit image

        if (!product.save()) {
            throw ApiError.badRequest(`Up to date Product name for this id ${id} does not saved`)
        }
        return {
            message: 'Product is successfully updated',
            product
        }
    }

    async getOne(id) {
        const product = await Product.findOne({where: {id}})
        if (!product) {
            throw ApiError.badRequest(`Product with this id ${id} does not exist`)
        }

        return product
    }
}

module.exports = new ProductService()