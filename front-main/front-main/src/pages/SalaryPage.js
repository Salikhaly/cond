import React, {useEffect, useState} from "react";
import {useLocation, useParams} from "react-router-dom";
import {Block, Box, Button, Typography} from "../shared/ui";
import {SalaryInfo} from "../widgets/SalaryInfo/SalaryInfo";
import {Advances} from "../widgets/Advances/Advances";
import {SalariesList} from "../entities/salary/list/SalariesList";
import {useAppContext} from "../app/provider/AppContextProvider";
import {Loading} from "../widgets/Loading";


const API_URL = process.env.API_URL_DEV
export function SalaryPage({}) {

    const { employeeId } = useParams();
    const location = useLocation();
    const { state } = location; // Получаем переданные данные из состояния


    const { salaryHandler } = useAppContext()
    const { createSalary, salaries, getSalaries, isLoading } = salaryHandler

    const [selectedSalary, setSelectedSalary] = useState()

    const [isSalLoading, setIsSalLoading] = useState(false)


    // const getSalaries = async () => {
    //     setIsSalLoading(true)
    //     try {
    //         const response = await fetch(API_URL+'/salaries/all/'+employeeId, {
    //             method: 'GET',
    //             headers: {
    //                 'Authorization': 'Bearer '+localStorage.getItem('token'),
    //                 'Content-Type': 'application/json',
    //             },
    //         });
    //
    //         if (response.ok) {
    //             const result = await response.json();
    //             console.log('FETCH SALARIES result.data:',result);
    //
    //             setSalaries(result);
    //         } else {
    //             console.error('Error fetching data categories:', response.status);
    //         }
    //     } catch (error) {
    //         console.error('Fetch error:', error);
    //     }
    //     setIsSalLoading(false)
    // }

    useEffect(() => {
        (async () => {
            await createSalary( {userId: employeeId} )
            await getSalaries( {userId: employeeId} )
        })()

    }, []);

    useEffect(() => {
        console.log("CHECKKKK salaries", salaries)

    }, [salaries]);


    useEffect(() => {
        console.log("CHECKKKK selectedSalary", selectedSalary)

    }, [selectedSalary]);


    if (isLoading || isSalLoading) {
        return <Loading />
    }

    return (<Box isScrollable={true} isContainer={true}>


        <Block marginBottom={20}>
            <Typography marginBottom={5} size={24} weight={700} text={'Зарплата сотрудника'}/>
            <Typography size={18} weight={500} text={state.name}/>
        </Block>

        <SalariesList selectedItem={selectedSalary} items={salaries} onSelect={setSelectedSalary}/>

        {selectedSalary && <SalaryInfo item={selectedSalary} />}

        {selectedSalary && <Advances salaryData={selectedSalary} />}


    </Box>)
}