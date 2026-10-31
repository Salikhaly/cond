const ApiError = require("../exceptions/ApiError")
const productService = require('../services/productService')
const {validationResult} = require('express-validator')

class ProductController {

    async createProduct(req, res, next) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return next(ApiError.badRequest('Validation errors', errors.array()))
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Файл не был загружен' });
            }
            // // Проверка наличия файла
            // if (!req.file) {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Изображение не было загружено',
            //     });
            // }


            const { name, ingredients, quantity, weight, additional, priceForEmployee } = req.body;

            if (quantity < 0) {
                return next(ApiError.badRequest('Product quantity must be >= 0'))
            }
            if (weight < 0) {
                return next(ApiError.badRequest('Product weight must be >= 0'))
            }
            if (priceForEmployee < 0) {
                return next(ApiError.badRequest('Product priceForEmployee must be >= 0'))
            }
            // const filePath = req.file.path
            // const image = req.file

            console.log('\n\n\nFILEFILEFILE',req.file, '\n\n\n\n')

            // Формируем URL для доступа к изображению
            // upload image
            // const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            const imageUrl = `/uploads/${req.file.filename}`;

            const product = await productService.create(name, Number(quantity), ingredients, weight, Number(priceForEmployee), additional, imageUrl);


            return res.json(product);
        } catch(e) {
            next(e)
        }
    }

    async getProducts(req, res, next) {
        try {
            const products = await productService.getAll();
            return res.json(products);
        } catch(e) {
            next(e)
        }
    }


    // TODO endpoint delete user
    async deleteProduct(req, res, next) {
        try {
            const productId = req.params.id;

            const deleted = await productService.delete(productId);
            // upload image

            return res.json(deleted);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint update user
    async updateProduct(req, res, next) {
        try {
            const productId = req.params.id;

            const { name, quantity, ingredients, weight, additional, priceForEmployee } = req.body;

            if (quantity < 0) {
                return next(ApiError.badRequest('Product quantity must be >= 0'))
            }
            if (weight < 0) {
                return next(ApiError.badRequest('Product weight must be >= 0'))
            }

            const data = {
                id: productId, name, quantity, ingredients, weight, additional, priceForEmployee: Number(priceForEmployee)
            }
            if (req.file) {
                // const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                const imageUrl = `/uploads/${req.file.filename}`;
                data.image = imageUrl
            }
            // edit image

            const product = await productService.update(data);
            return res.json(product);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint get one user
    async getOneProduct(req, res, next) {
        try {
            const productId = req.params.id;

            const product = await productService.getOne(productId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }
    }

}

module.exports = new ProductController()