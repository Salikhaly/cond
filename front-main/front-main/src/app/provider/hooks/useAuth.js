import React, {useMemo, useState} from 'react';
import AuthService from "../../services/AuthService";
import {API_URL} from "../../http";
import axios from "axios";
import Logger from "../../../shared/internal/Logger";
export default function useAuth() {

    const logger = useMemo(()=>new Logger('useAuth'), []);

    const [user, setUser] = useState(null);
    const [isAuth, setAuth] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState(null);
    const [timeOut, setTimeOut] = useState(false);
    const [authState, setAuthState] = useState({
        type: '',
        email: '',
    });

    // сделать норм обработку ошибок, чтобы каждая функция не затирала состояние, а создать объект и положить в соответ свойства и по ним уже проверять в форме
    const login = async (email, password) => {
        if (!timeOut) {
            setStatus(null);
            // setAuthState({
            //     email: email,
            //     type: 'signin',
            // });
            setLoading(true)
            try {
                const response = await AuthService.login(email, password);
                setStatus(response.data.status); // Предполагается, что сервер вернул данные пользователя
                setTimeOut(true)
            } catch (e) {
                // logger.error('Ошибка аутентификации', e);
                setError(e.response?.data?.message)
            } finally {
                setLoading(false)
            }
        }
    };

    const registration = async (email, password) => {
        setStatus(null);
        setAuthState({
            email: email,
            type: 'signup',
        });
        setLoading(true)
        try {
            const response = await AuthService.registration(email, password);

            setStatus(response.data)
            // logger.log('STOREEEEE RESPONSE SERVER API', response)
            // localStorage.setItem('token', response.data.accessToken);
            // this.setAuth(true)
            // this.setUser(response.data.user)
        } catch (e) {
            // logger.log(e.response?.data?.message);
            setError(e.response?.data?.message)
        } finally {
            setLoading(false)
        }
    }


    const checkCode = async (email, code) => {
        // setError('');
        setLoading(true)
        try {
            const response = await AuthService.checkCode(email, code);

            logger.log('useAuth check code response', response)
            localStorage.setItem('token', response.data.accessToken);
            setAuth(true)
            setUser(response.data.user)
        } catch (e) {
            // logger.log(e.response?.data?.message);
            setError(e.response?.data?.message)
        } finally {
            setLoading(false)
        }
    }



    const logout = async () =>  {
        // setError('');
        setLoading(true)
        try {
            const response = await AuthService.logout();
            localStorage.removeItem('token')
            setAuth(false)
            setUser({})
        } catch (e) {
            // logger.log(e.response?.data?.message);
            setError(e.response?.data?.message)
        } finally {
            setLoading(false)
        }
    }

    const checkAuth = async () => {
        // setError('');
        setLoading(true)
        try {
            const response = await axios.get(`${API_URL}/auth/refresh`, {withCredentials:true})
            logger.log('checkAuth', response)
            localStorage.setItem('token', response.data.accessToken);
            setAuth(true)
            setUser(response.data.user)

        } catch (e) {
            // logger.log(e.response?.data?.message)
            setError(e.response?.data?.message)
        } finally {
            setLoading(false)
        }
    }


    return ({
        user,
        login, registration, checkCode, logout,
        isAuth,
        error, setError,
        isLoading, setLoading,
        authState, setAuthState,
        status, setStatus,
        timeOut, setTimeOut,
        checkAuth // !!! TODO: make endpoint in backend
    })

}