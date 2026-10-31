import {$api, $apiFile} from "../http";

export default class ProductService {

    static async getProducts() {
        return $api.get('/products');
    }

    static async getProduct(id) {
        return $api.get(`/products/${id}`);
    }

    static async createProduct(formData) {
        return $apiFile.post('/products', formData);
    }

    static async deleteProduct(id) {
        return $api.delete(`/products/${id}`);
    }

    static async updateProduct(id, name, ingredients) {
        return $api.put(`/products/${id}`, {name, ingredients});
    }

}