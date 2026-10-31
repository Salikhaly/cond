import React, {useMemo, useState} from "react";
import UserService from "../../services/UserService";
import Logger from "../../../shared/internal/Logger";

export default function useAdmin() {

    const logger = useMemo(()=>new Logger('useAdmin'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [users, setUsers] = useState([]);

    async function getUsers() {
        setIsLoading(true)
        try {
            const response = await UserService.getUsers()
            setUsers(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createUser({name, email}) {
        setIsLoading(true)
        try {
            const response = await UserService.createUser(name,email)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteUser({employeeId}) {
        setIsLoading(true)
        try {
            const response = await UserService.deleteUser(employeeId)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function updateUser({employeeId, name}) {
        setIsLoading(true)
        try {
            const response = await UserService.updateUser(employeeId, name)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

    return ({
        users,
        getUsers, createUser,
        deleteUser, updateUser,
        isLoading,
    })
}