import {$api} from "../http";

export default class SalaryServices {

    static async getOne(userId) {
        return $api.get(`/salaries/${userId}`);
    }

    static async getAll(userId) {
        return $api.get(`/salaries/all/${userId}`);
    }

    static async create(salaryId) {
        return $api.post(`/salaries/${salaryId}`);
    }

    static async update(salaryId, amount) {
        return $api.put(`/salaries/${salaryId}`, { amount });
    }

    static async delete(salaryId) {
        return $api.delete(`/salaries/${salaryId}`);
    }



    static async createAdvances(salaryId, amount, payment_type) {
        return $api.post(`/salaries/advances/${salaryId}`, {amount, payment_type});
    }

    static async getAdvances(salaryId) {
        return $api.get(`/salaries/advances/${salaryId}`);
    }

    static async updateAdvance(advanceId, amount, payment_type) {
        return $api.put(`/salaries/advances/${advanceId}`, {amount, payment_type});
    }

    static async deleteAdvance(advanceId) {
        return $api.delete(`/salaries/advances/${advanceId}`);
    }

}