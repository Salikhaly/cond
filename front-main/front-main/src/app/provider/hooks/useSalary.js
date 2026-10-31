import React, {useMemo, useState} from "react";
import Logger from "../../../shared/internal/Logger";
import OutcomeServices from "../../services/OutcomeServices";
import SalaryServices from "../../services/SalaryServices";

export default function useSalary() {

    const logger = useMemo(()=>new Logger('useSalary'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [salary, setSalary] = useState(null);
    const [salaries, setSalaries] = useState([null]);
    const [advances, setAdvances] = useState([]);

    async function getSalary({ salaryId }) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.getOne(salaryId)
            setSalary(response.data)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function getSalaries({ userId }) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.getAll(userId)
            setSalaries(response.data)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createSalary({ userId }) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.create(userId)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateSalary({ salaryId, amount }) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.update(salaryId, amount)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function deleteSalary({ salaryId }) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.delete(salaryId)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function getAdvances({salaryId}) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.getAdvances(salaryId)
            setAdvances(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createAdvance({salaryId, amount, payment_type}) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.createAdvances(salaryId, amount, payment_type)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateAdvance({advanceId, amount, payment_type}) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.updateAdvance(advanceId, amount, payment_type)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function deleteAdvance({advanceId}) {
        setIsLoading(true)
        try {
            const response = await SalaryServices.deleteAdvance(advanceId)
            // setRelationsProducts(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    return ({
        isLoading,
        salary, getSalary, createSalary, deleteSalary, updateSalary,
        salaries, getSalaries,
        advances, getAdvances, createAdvance, updateAdvance, deleteAdvance,

        setSalaries
    })
}