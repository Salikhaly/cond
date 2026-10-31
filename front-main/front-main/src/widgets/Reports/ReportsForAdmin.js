import React, {useEffect, useState} from "react";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {ReportsItem} from "../../entities/reports/item/ReportsItem";
import {Block, Button, Typography} from "../../shared/ui";
import {Loading} from "../Loading";
import useToggle from "../../shared/hooks/useToggle";
import {EmployeeCreate} from "../../features/employee/create/EmployeeCreate";
import {EmployeeCard} from "../../entities/employee/EmployeeCard/EmployeeCard";
import {useNavigate} from "react-router-dom";
import {ReportProductsChart} from "../../entities/reports/charts/ReportProductsChart";
import {ReportEmployeesChart} from "../../entities/reports/charts/ReportEmployessChart";
import {FilterDate} from "../../features/filter/FilterDate";


export function ReportsForAdmin({}) {

    const { adminHandler, productsHandler, reportsHandler } = useAppContext()
    const { users, getUsers } = adminHandler
    const { products, getProducts, isLoading} = productsHandler
    const { reports, getAllReports} = reportsHandler
    const { reportsIsLoading } = reportsHandler.isLoading

    const [employees, setEmployees] = useState([])

    const [filter, setFilter] = useState({
        order: 'DESC',
        date: '',
        dateFrom: '',
        dateTo: '',
    });

    const navigate = useNavigate()

    useEffect(() => {
        (async () => {
            await getUsers()
            await getProducts()
        })()
        setEmployees(users)
    }, []);

    useEffect(() => {
        (async () => {
            await getAllReports(filter)
        })()
    }, [filter])


    useEffect(() => {
        setEmployees(users)
    }, [users]);


    useEffect(() => {
        console.log('ALL PRODUCTS', products)
    }, [products]);

    useEffect(() => {
        console.log('ALL REPORTS', reports)
    }, [reports]);


    if (isLoading || reportsIsLoading) {
        return <Loading/>
    }

    return (<Block width={'100%'} padding={'0 0 20px 0'}>

        <Block marginBottom={20}>
            <Typography size={24} weight={700} text={'Товаров на складе'}/>

            <ReportProductsChart data={products}/>
        </Block>

        <Block marginBottom={20}>
            <Typography size={24} weight={700} text={'Отчеты сотрудников'}/>

            <FilterDate filter={filter} onChange={setFilter} />
            <ReportEmployeesChart data={reports}/>
        </Block>

        {!employees.find(e => e.role == 'employee') && <Typography size={16} weight={400} text={'Нет сотрудников.'}/>}

        {employees.map( (e, eid) => {
            if (e.role !== 'super_admin') {
                const data = e
                console.log('EMPLOYEE', e.id)
                return <EmployeeCard isJustList={true} key={eid} data={e} />
            }
        })}

    </Block>)


}