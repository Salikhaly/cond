import {$api} from "../http";

export default class RelationService {

    static async getRelations() {
        return $api.get('/relations');
    }

    static async getRelation(id) {
        return $api.get(`/relations/${id}`);
    }

    static async createRelation(name, category) {
        return $api.post('/relations', {name, category});
    }

    static async deleteRelation(id) {
        return $api.delete(`/relations/${id}`);
    }

    static async updateRelation(id, name) {
        return $api.put(`/relations/${id}`, {name});
    }

    static async addProduct(productId, relationId, price) {
        return $api.post(`/relations/${relationId}/products`, {productId, relationId, price});
    }

    static async getRelationsProducts(relationId) {
        return $api.get(`/relations/${relationId}/products`);
    }

    static async updateRelationProduct(relationId, productId, price) {
        return $api.put(`/relations/${relationId}/products/${productId}`, {price});
    }

    static async deleteRelationProduct(relationId, productId) {
        return $api.delete(`/relations/${relationId}/products/${productId}`);
    }

}