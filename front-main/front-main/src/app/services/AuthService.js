import { $api, $apiCheckAuth } from '../http';

export default class AuthService {
    static async login(email, password) {
        // return $api.post('/login', {email, password})
        return $api.post('/auth/login', {email, password})
    }

    static async logout() {
        return $api.post('/auth/logout')
    }

    static async checkCode(email, code) {
        return $api.post('/auth/activate', {email, code})
    }
    static async checkAuth() {
        console.log('AUTHHH CHECK')
        return $apiCheckAuth.get('/auth/refresh')
    }

}