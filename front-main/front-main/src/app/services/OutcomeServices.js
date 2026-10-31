import {$api} from "../http";

export default class OutcomeServices {

    static async getAll(filter) {
        console.log('SEEEEEND FILTER: filter', filter)
        return $api.get('/outcome', { params: filter });
    }
    //
    //
    // static async getAllByEmployee(employeeId) {
    //     return $apiAuthed.get('/reports/'+employeeId);
    // }
    //
    // // static async getRelation(id) {
    // //     return $api.get(`/reports/${id}`);
    // // }
    //
    static async create(recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date) {
        return $api.post('/outcome', { recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date });
    }


    static async update(outcomeId, recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date) {
        return $api.put(`/outcome/${outcomeId}`, { recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date });
    }
    static async delete(outcomeId) {
        return $api.delete(`/outcome/${outcomeId}`);
    }


    static async addCategory(name) {
        return $api.post(`/outcome/categories`, {name});
    }

    static async getCategories() {
        return $api.get(`/outcome/categories`);
    }

    static async updateCategory(categoryId, name) {
        return $api.put(`/outcome/categories/${categoryId}`, {name});
    }

    static async deleteCategory(categoryId) {
        return $api.delete(`/outcome/categories/${categoryId}`);
    }

}