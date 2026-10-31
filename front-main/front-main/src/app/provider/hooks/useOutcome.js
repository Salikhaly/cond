import React, {useMemo, useState} from "react";
import Logger from "../../../shared/internal/Logger";
import OutcomeServices from "../../services/OutcomeServices";

export default function useOutcome() {

    const logger = useMemo(()=>new Logger('useOutcome'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [outcomes, setOutcomes] = useState([]);
    const [categories, setCategories] = useState([]);

    async function getOutcomes(filter) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.getAll(filter)
            setOutcomes(response.data)

            return response.data // может в этом был прикол, с товарами в отчетах, в return и в лишнем "/" в эндпоинте
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createOutcome({ recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date }) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.create(recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateOutcome({ outcomeId, recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date }) {
        setIsLoading(true)
        try {
            console.log('OUTCOME UPDATE API', outcomeId)
            const response = await OutcomeServices.update(outcomeId, recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function deleteOutcome({ outcomeId }) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.delete(outcomeId)

            return response.data
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }
    //
    // async function getReportsByEmployee(employeeId) {
    //     setIsLoading(true)
    //     try {
    //         const response = await ReportService.getAllByEmployee(employeeId)
    //         setReports(response.data)
    //     } catch (e) {
    //         console.error(e);
    //         // setError(e.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    //
    // }
    //
    // async function createTodayReport() {
    //     setIsLoading(true)
    //     try {
    //         const response = await ReportService.create()
    //         console.log('TODAAAAY REPORT GETTING',response.data)
    //         if (response.data.message) {
    //             setTodayReport(response.data.report)
    //         } else {
    //             setTodayReport(response.data)
    //         }
    //
    //         return response.data
    //     } catch (e) {
    //         logger.error(e);
    //         // setError(e.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }

    // async function deleteRelation({relationId}) {
    //     setIsLoading(true)
    //     try {
    //         const response = await RelationService.deleteRelation(relationId)
    //
    //         return response.data
    //     } catch (e) {
    //         logger.error(e);
    //         // setError(e.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }
    //
    // async function updateRelation({relationId, name}) {
    //     setIsLoading(true)
    //     try {
    //         const response = await RelationService.updateRelation(relationId, name)
    //
    //         return response.data
    //     } catch (e) {
    //         logger.error(e);
    //         // setError(e.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }
    async function getCategories() {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.getCategories()
            setCategories(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createCategory({name}) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.addCategory(name)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function updateCategory({categoryId, name}) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.updateCategory(categoryId, name)
            // setRelationsProducts(response.data)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }
    //
    async function deleteCategory({categoryId}) {
        setIsLoading(true)
        try {
            const response = await OutcomeServices.deleteCategory(categoryId)
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
        outcomes, getOutcomes, createOutcome, deleteOutcome, updateOutcome,
        categories, getCategories, createCategory, updateCategory, deleteCategory
    })
}