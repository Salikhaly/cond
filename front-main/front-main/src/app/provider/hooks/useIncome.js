import React, {useMemo, useState} from "react";
import Logger from "../../../shared/internal/Logger";
import IncomeServices from "../../services/IncomeServices";

export default function useIncome() {

    const logger = useMemo(()=>new Logger('useIncome'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [incomes, setIncomes] = useState([]);

    async function getIncomes(filter) {
        setIsLoading(true)
        try {
            const response = await IncomeServices.getAll(filter)
            setIncomes(response.data)

            return response.data // может в этом был прикол, с товарами в отчетах, в return и в лишнем "/" в эндпоинте
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createIncome({ clientId, productId, weight, quantity, date }) {
        setIsLoading(true)
        try {
            const response = await IncomeServices.create(clientId, productId, weight, quantity, date)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateIncome({ incomeId, weight, quantity, date }) {
        setIsLoading(true)
        try {
            console.log('INCOME UPDATE API', incomeId)
            const response = await IncomeServices.update(incomeId, weight, quantity, date)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function deleteIncome({ incomeId }) {
        setIsLoading(true)
        try {
            const response = await IncomeServices.delete(incomeId)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }


    return ({
        isLoading,
        incomes, getIncomes, createIncome, deleteIncome, updateIncome,
    })
}