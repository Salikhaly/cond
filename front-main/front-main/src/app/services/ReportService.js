import {$api} from "../http";

export default class ReportService {

    static async getAll(filter) {
        return $api.get('/reports/', { params: filter });
    }

    static async getAllReports(filter) {
        return $api.get('/reports/statistics', { params: filter });
    }


    static async getAllByEmployee(employeeId, filter) {
        return $api.get('/reports/'+employeeId, { params: filter });
    }

    // static async getRelation(id) {
    //     return $api.get(`/reports/${id}`);
    // }

    static async create() {
        return $api.post('/reports');
    }

    static async delete(id) {
        return $api.delete(`/reports/${id}`);
    }

    static async update(id, name) {
        return $api.put(`/reports/${id}`, {name});
    }

    static async addProduct(productId, reportId, measure, quantity) {
        return $api.post(`/reports/${reportId}/products`, {productId, reportId, measure, quantity});
    }

    static async getReportProducts(reportId) {
        return $api.get(`/reports/${reportId}/products`);
    }

    static async updateReportProduct(reportId, productId, measure, quantity) {
        return $api.put(`/reports/${reportId}/products/${productId}`, {measure, quantity});
    }

    static async deleteReportProduct(reportId, productId) {
        return $api.delete(`/reports/${reportId}/products/${productId}`);
    }

}