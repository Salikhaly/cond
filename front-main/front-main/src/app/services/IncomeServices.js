import {$api} from "../http";

export default class IncomeServices {

    static async getAll(filter) {
        console.log('SEEEEEND FILTER: filter', filter)
        return $api.get('/income', { params: filter });
    }

    static async create(clientId, productId, weight, quantity, date) {
        return $api.post('/income', { clientId, productId, weight, quantity, date });
    }

    static async update(incomeId, weight, quantity, date) {
        return $api.put(`/income/${incomeId}`, { weight, quantity, date });
    }
    static async delete(incomeId) {
        return $api.delete(`/income/${incomeId}`);
    }


}