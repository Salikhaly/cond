import React, {useMemo, useState} from "react";
import Logger from "../../../shared/internal/Logger";
import ReportService from "../../services/ReportService";

export default function useReports() {

    const logger = useMemo(()=>new Logger('useReports'), []);
    const [isLoading, setIsLoading] = useState(false)
    const [reports, setReports] = useState([]);
    const [reportsProducts, setReportsProducts] = useState([]);
    const [todayReport, setTodayReport] = useState(null);

    async function getReports(filter) {
        setIsLoading(true)
        try {
            const response = await ReportService.getAll(filter)
            setReports(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function getAllReports(filter) {
        setIsLoading(true)
        try {
            const response = await ReportService.getAllReports(filter)
            // console.log('FETCHING DATA ALL REPORTS: ', response.data)
            setReports(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function getReportsByEmployee(employeeId, filter) {
        setIsLoading(true)
        try {
            const response = await ReportService.getAllByEmployee(employeeId, filter)
            setReports(response.data)
        } catch (e) {
            console.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }

    async function createTodayReport() {
        setIsLoading(true)
        try {
            const response = await ReportService.create()
            console.log('TODAAAAY REPORT GETTING',response.data)
            if (response.data.message) {
                setTodayReport(response.data.report)
            } else {
                setTodayReport(response.data)
            }

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }

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

    async function addReportProduct({productId, reportId, measure, quantity}) {
        setIsLoading(true)
        try {
            const response = await ReportService.addProduct(productId, reportId,  measure, quantity)

            return response.data
        } catch (e) {
            logger.error(e);
            // setError(e.response?.data?.message)
        } finally {
            setIsLoading(false)
        }

    }
    // const API_URL = process.env.API_URL_DEV
    //
    // const getReportProducts = async () => {
    //     setIsLoading(true)
    //     try {
    //         const response = await fetch(API_URL+'/reports/'+item.id+'/products', {
    //             method: 'GET',
    //             headers: {
    //                 'Authorization': 'Bearer '+localStorage.getItem('token'),
    //                 'Content-Type': 'application/json',
    //             },
    //         });
    //
    //         if (response.ok) {
    //             const result = await response.json();
    //             console.log('!1111111111 result.data:',result);
    //
    //             setReportProducts(result.products);
    //         } else {
    //             console.error('Error fetching data:', response.status);
    //         }
    //     } catch (error) {
    //         console.error('Fetch error:', error);
    //     }
    //     setIsLoading(false)
    // }
    // async function getReportsProducts({reportId}) {
    //     setIsLoading(true)
    //     try {
    //         const response = await ReportService.getReportProducts(reportId)
    //         setReportsProducts(response.data.products)
    //
    //         return response.data
    //     } catch (e) {
    //         logger.error(e);
    //         // setError(e.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    //
    // }

    async function updateReportProduct({reportId, productId, measure, quantity}) {
        setIsLoading(true)
        try {
            const response = await ReportService.updateReportProduct(reportId, productId, measure, quantity)
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
    async function deleteReportProduct({reportId, productId}) {
        setIsLoading(true)
        try {
            const response = await ReportService.deleteReportProduct(reportId, productId)
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
        reports,todayReport,
        getReports, createTodayReport,
        getAllReports,
        // deleteRelation, updateRelation,
        isLoading,
        addReportProduct,reportsProducts,
        // getReportsProducts,
        updateReportProduct, getReportsByEmployee,
        deleteReportProduct
        // relationsProducts,
        // updateRelationProduct, deleteRelationProduct
    })
}