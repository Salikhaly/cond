import axios from 'axios';

export const API_URL = process.env.API_URL_DEV || '/api';


const $apiCheckAuth = axios.create({
    withCredentials: true,
    baseURL: API_URL,
    headers: {
        // 'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
})

const $api = axios.create({
    withCredentials: true,
    baseURL: API_URL,
})
const $apiFile = axios.create({
    withCredentials: true,
    headers: {
        // 'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    baseURL: API_URL,
})


$api.interceptors.request.use((router) => {
    router.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    return router;
})

$api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._isRetry) {
            originalRequest._isRetry = true; // Флаг предотвращает зацикливание
            try {
                console.log('Refreshing token...');

                // Запрос на обновление токена
                const refreshResponse = await axios.get(`${API_URL}/auth/refresh`, {
                    withCredentials: true,
                });

                // Сохраняем новый токен
                const newToken = refreshResponse.data.accessToken;
                localStorage.setItem('token', newToken);
                console.log('Token has been refreshed...', newToken);

                // Обновляем заголовки оригинального запроса
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                // Повторяем запрос
                return $api.request(originalRequest);
            } catch (e) {
                console.error('Error refreshing token:', e.message);
                window.location.href = '/auth'; // Перенаправление на страницу входа
            }
        }

        return Promise.reject(error);
    }
);

export { $api, $apiCheckAuth, $apiFile }
