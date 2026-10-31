const {BusinessRelation, User, Product, BusinessRelationProducts} = require("../models/models")
const ApiError = require('../exceptions/ApiError');
const UserDto = require("../dtos/userDto");

class RelationsService {

    async create(name, category) {

        const relation = await BusinessRelation.create({name, category})

        return {
            message: 'Relation added successfully',
            relation
        }


    }

    async getAll() {

        return await BusinessRelation.findAll({
            order: [['createdAt', 'DESC']],
            where: {
                is_active: true,
            }
        })
    }

    async getAllClients() {

        return await BusinessRelation.findAll({
            order: [['createdAt', 'DESC']],
            where: {
                category: 'clients',
                is_active: true,
            }
        })
    }

    async getAllSuppliers() {

        return await BusinessRelation.findAll({
            order: [['createdAt', 'DESC']],
            where: {
                category: 'suppliers',
                is_active: true,
            }
        })
    }

    async delete(id) {
        const relation = await BusinessRelation.findByPk(id)

        relation.is_active = false
        const is_deleted = await relation.save()

        if (is_deleted) {
            return { "message": "Relation deleted successfully" }
        } else {
            throw ApiError.badRequest(`Ошибка при удалении: не сохранились изменения. Relation id ${id} not found`);
        }
    }

    async destroy(id) {
        const deleted = await BusinessRelation.destroy({where: {id}})

        if (deleted) {
            return { "message": "Relation deleted successfully" }
        } else {
            throw ApiError.badRequest(`Relation id ${id} not found`);
        }
    }

    async update(name, id) {
        const relation = await BusinessRelation.findOne({where: {id}})
        if (!relation) {
            throw ApiError.badRequest(`Relation with id ${id} not found`);
        }
        relation.name = name
        if (!relation.save()) {
            throw ApiError.badRequest(`Up to date Relation name for this id ${id} does not saved`)
        }
        return {
            message: 'Relation is successfully updated',
            relation
        }
    }

    async getOne(id) {
        const relation = await BusinessRelation.findOne({where: {id}})
        if (!relation) {
            throw ApiError.badRequest(`Relation with this id ${id} does not exist`)
        }

        return relation
    }



    async addProduct(productId, relationId, price) {

        console.log('\n\n\nPRICE', price,'\n\n\n\n')

        const product = await Product.findByPk(productId);
        const businessRelation = await BusinessRelation.findByPk(relationId);

        if (!product || !businessRelation) {
            throw new Error('Product или BusinessRelation не найдены');
        }

        const res = await BusinessRelationProducts.create({
            productId: product.id,
            businessRelationId: businessRelation.id,
            price
        });

        return {res}
    }

    async getProducts(relationId) {

        const relationProducts = await BusinessRelationProducts.findAll({where: {businessRelationId: relationId},
            order: [['updatedAt', 'DESC']],
            include: [
                // { model: Product },
            ],
        });
        //
        // // Извлекаем productId из полученных записей
        // const productIds = relationProducts.map(rp => rp.productId);
        // let products = [];
        // if (productIds.length > 0) {
        //     // Получаем все продукты по найденным productId
        //     products = await Product.findAll({
        //         where: {
        //             id: productIds, // Условие для получения продуктов с указанными productId
        //         },
        //     });
        //
        //     console.log(products); // Здесь будут все продукты, связанные с данным businessRelationId
        // } else {
        //     console.log('Нет продуктов для данного бизнес-отношения.');
        // }
        let res_products = []

        // Извлекаем productId и price из полученных записей
        const productData = relationProducts.map(rp => ({
            productId: rp.productId,
            price: rp.price,
        }));

        // Проверяем, есть ли productData для дальнейшего запроса
        if (productData.length > 0) {
            // Получаем все продукты по найденным productId
            const products = await Product.findAll({
                where: {
                    id: productData.map(pd => pd.productId), // Условие для получения продуктов
                    is_active: true,
                },
            });

            // Объединяем продукты с ценами
            res_products = products.map(product => {
                const matchedData = productData.find(pd => pd.productId === product.id);
                return {
                    id: product.id,
                    name: product.name,
                    image: product.image,
                    quantity: product.quantity,
                    ingredients: product.ingredients,
                    weightTotal: product.weightTotal,
                    priceTotal: product.priceTotal,
                    weight: product.weight,
                    price: matchedData ? matchedData.price : null, // Добавляем цену, если есть
                };
            });
            console.log(products); // Новый массив объектов с продуктами и ценами
        } else {
            console.log('Нет продуктов для данного бизнес-отношения.');
        }





        // const businessRelation = await BusinessRelation.findByPk(relationId);

        // if (!product || !businessRelation) {
        //     throw new Error('Product или BusinessRelation не найдены');
        // }

        // const res = await BusinessRelationProducts.create({
        //     productId: product.id,
        //     businessRelationId: businessRelation.id,
        //     price
        // });

        return {products: res_products}
    }


    async updateProductPrice(relationId, productId, price) {

        console.log('\n\n\n\n',relationId, productId, price, '\n\n\n\n')

        const relationProduct = await BusinessRelationProducts.findOne(
            {where: {businessRelationId: relationId, productId},
        });
        if (!relationProduct) {
            throw ApiError.badRequest(`relationProduct with relationId ${relationId} productId ${productId} not found`);
        }

        relationProduct.price = price
        if (!relationProduct.save()) {
            throw ApiError.badRequest(`Up to date Relation name for this relationId ${relationId} productId ${productId} does not saved`)
        }

        return {
            message: 'Relation product price is successfully updated',
            relationProduct
        }

    }


    async deleteProduct(relationId, productId) {

        const deletedRelationProduct = await BusinessRelationProducts.destroy(
            {where: {businessRelationId: relationId, productId},
        });

        if (deletedRelationProduct) {
            return { "message": "Relation Product deleted successfully" }
        } else {
            throw ApiError.badRequest(`Relation Product relationId ${relationId} productId ${productId} not found`);
        }

    }


}

module.exports = new RelationsService()