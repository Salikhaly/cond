import React, {useEffect, useState} from "react";
import {useLocation, useParams} from "react-router-dom";
import {useAppContext} from "../app/provider/AppContextProvider";
import {Loading} from "../widgets/Loading";
import {Block, Box, Typography} from "../shared/ui";
import {ReportsItem} from "../entities/reports/item/ReportsItem";
import {FilterDate} from "../features/filter/FilterDate";


export function OneReportPage({}) {

    const { employeeId } = useParams();
    const location = useLocation();
    const { state } = location; // Получаем переданные данные из состояния

    const { reportsHandler } = useAppContext()
    const { reports, getReportsByEmployee, isLoading } = reportsHandler

    const [filter, setFilter] = useState({
        order: 'DESC',
        date: '',
        dateFrom: '',
        dateTo: '',
    });

    function fetchRecords() {
        (async () => {
            await getReportsByEmployee(employeeId, filter)
        })()
    }

    useEffect(() => {
        console.log("CHECKKKK reports", reports)

    }, [reports]);


    // useEffect(() => {
    //     fetchRecords()
    //
    // }, []);

    useEffect(() => {
        fetchRecords()

        console.log('REPORTS: filter', filter)
    }, [filter]);


    if (isLoading) {
        return <Loading />
    }


    return (<Box isScrollable={true} isContainer={true}>
        <Block marginBottom={15}>
            <Typography marginBottom={5} size={24} weight={700} text={'Отчет сотрудника'}/>
            <Typography size={18} weight={500} text={state.name}/>
            {/*<Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>*/}
        </Block>

        <FilterDate filter={filter} onChange={setFilter}/>

        <Block marginBottom={10}></Block>

        {reports.length < 1 &&
            <Block marginTop={0} marginBottom={25}>
                <Typography size={16} weight={400} text={`Нет отчетов.`}/>
            </Block>
        }


        {reports.map( (r, key) => {

            return <ReportsItem isAdmin={true} key={key} item={ r } reportId={r.id} />
        })}

    </Box>)
}