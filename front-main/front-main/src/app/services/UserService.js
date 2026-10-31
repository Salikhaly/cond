import {$api} from "../http";

export default class UserService {

    static async getUsers() {
        return $api.get('/profile/employees');
    }

    static async createUser(name, email) {
        return $api.post('/profile/employees', {name, email});
    }

    static async deleteUser(id) {
        return $api.delete(`/profile/employees/${id}`);
    }

    static async updateUser(id, name) {
        return $api.put(`/profile/employees/${id}`, {name});
    }

}