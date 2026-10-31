const ApiError = require("../exceptions/ApiError")
const relationsService = require('../services/relationsService')
const {validationResult} = require('express-validator')

class RelationsController {

    async createRelation(req, res, next) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return next(ApiError.badRequest('Validation errors', errors.array()))
            }

            const {name, category} = req.body;

            const relation = await relationsService.create(name, category);


            return res.json(relation);
        } catch(e) {
            next(e)
        }
    }

    async getRelations(req, res, next) {
        try {
            const relations = await relationsService.getAll();
            return res.json(relations);
        } catch(e) {
            next(e)
        }
    }

    async getClients(req, res, next) {
        try {
            const clients = await relationsService.getAllClients();
            return res.json(clients);
        } catch(e) {
            next(e)
        }
    }

    async getSuppliers(req, res, next) {
        try {
            const suppliers = await relationsService.getAllSuppliers();
            return res.json(suppliers);
        } catch(e) {
            next(e)
        }
    }


    // TODO endpoint delete user
    async deleteRelation(req, res, next) {
        try {
            const relationId = req.params.id;

            const deleted = await relationsService.delete(relationId);
            return res.json(deleted);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint update user
    async updateRelation(req, res, next) {
        try {
            const relationId = req.params.id;
            const {name} = req.body; // data for updating

            const relation = await relationsService.update(name, relationId);
            return res.json(relation);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint get one user
    async getOneRelation(req, res, next) {
        try {
            const relationId = req.params.id;

            const product = await relationsService.getOne(relationId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }
    }

    async addProduct(req, res, next) {
         // productId, businessRelationId, price
        try {
            const relationId = req.params.id;
            const {productId, price} = req.body;

            const product = await relationsService.addProduct(productId, relationId, price);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

    async getAllProducts(req, res, next) {
         // productId, businessRelationId, price
        try {
            const relationId = req.params.id;

            const products = await relationsService.getProducts(relationId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(products);
        } catch(e) {
            next(e)
        }


    }

    async getProducts(req, res, next) {
         // productId, businessRelationId, price
        try {
            const relationId = req.params.id;

            const products = await relationsService.getProducts(relationId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(products);
        } catch(e) {
            next(e)
        }


    }

    async updateProductPrice(req, res, next) {
         // productId, businessRelationId, price
        try {
            const relationId = req.params.id;
            const productId = req.params.productId;
            const {price} = req.body

            const product = await relationsService.updateProductPrice(relationId, productId, price);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

    async deleteProduct(req, res, next) {
         // productId, businessRelationId, price
        try {
            const relationId = req.params.id;
            const productId = req.params.productId;

            const product = await relationsService.deleteProduct(relationId, productId);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(product);
        } catch(e) {
            next(e)
        }


    }

}

module.exports = new RelationsController()