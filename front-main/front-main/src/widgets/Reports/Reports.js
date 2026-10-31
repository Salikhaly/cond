import React, {useEffect, useState} from "react";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {ReportsItem} from "../../entities/reports/item/ReportsItem";
import {Block, Typography} from "../../shared/ui";
import {Loading} from "../Loading";
import {FilterDate} from "../../features/filter/FilterDate";


export function Reports({}) {

    const { reportsHandler } = useAppContext()
    const { reports, todayReport, createTodayReport, getReports, isLoading } = reportsHandler

    const [filter, setFilter] = useState({
        order: 'DESC',
        date: '',
        dateFrom: '',
        dateTo: '',
    });

    async function fetchRecords() {
        await (async () => {
            await getReports(filter)
        })()
    }

    useEffect(() => {
        (async () => {
            await createTodayReport()
        })()

    }, []);

    useEffect(() => {
        console.log("CHECKKKK reports", reports)

    }, [reports]);

    useEffect(() => {
        console.log("!!!!!!!!!!!! TODAY REPORT !@# reports", todayReport)

    }, [todayReport]);

    useEffect(() => {
        fetchRecords()

    }, []);

    useEffect(() => {
        fetchRecords()

        console.log('REPORTS: filter', filter)
    }, [filter]);


    if (isLoading) {
        return <Loading />
    }


    return (<>

        {/*<Block marginBottom={10}>*/}
        {/*    <FilterDate filter={filter} onChange={setFilter}/>*/}
        {/*</Block>*/}

        {reports.length < 1 &&
            <Block marginTop={0} marginBottom={25}>
                <Typography size={16} weight={400} text={`Нет прошлых отчетов. Заполните сегодняшний.`}/>
            </Block>
        }

        {todayReport && <ReportsItem item={todayReport} reportId={todayReport?.id} isCurrent={true} />}



        {reports.map( (r, key) => {

            return <ReportsItem key={key} item={ r } reportId={r.id} />
        })}

    </>)
}