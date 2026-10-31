import React, {useEffect, useState} from "react";
import {Block, Button, Typography} from "../../shared/ui";
import useToggle from "../../shared/hooks/useToggle";
import {SalaryAdd} from "../../features/salary/add/SalaryAdd";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {Loading} from "../Loading";
import {$api} from "../../app/http";

const API_URL = process.env.API_URL_DEV

export function SalaryInfo({ item }) {

    const [isSalaryAddModal, toggleSalaryAddModal] = useToggle()
    const [isLoading, setIsLoading] = useState(false)

    const [salary, setSalary] = useState(null)
    const getSalary = async () => {
        setIsLoading(true)
        try {
            const response = await $api.get(`/salaries/${item.id}`);
            console.log('FETCH SALARIES result.data:', response.data);

            setSalary(response.data);
        } catch (error) {
            if (error.response) {
                // Сервер вернул код ошибки (4xx, 5xx)
                console.error('Error fetching data categories:', error.response.status, error.response.data);
            } else {
                // Проблемы с сетью или сам запрос
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            await getSalary()
        })()
    }, [item]);

    useEffect(() => {
        console.log("CHECKKKK salary", salary)

    }, [salary]);

    if (isLoading) {
        return <Loading />
    }

    return (<>
        { isSalaryAddModal && <SalaryAdd userId={salary.userId} salaryId={salary.id} onClose={toggleSalaryAddModal}/> }

        {!salary || salary.total_amount < 1 &&
            <Block marginTop={20} marginBottom={25}>
                <Typography size={16} weight={400} text={`Нет информации о зарплате. У сотрудника нет заполненных отчетов.`}/>
                {/*<Button marginTop={10} onClick={toggleSalaryAddModal}>Добавить</Button>*/}
            </Block>
        }

        {salary && salary.total_amount >= 1 &&
            <Block marginTop={10} marginBottom={15}>
                <Typography size={18} weight={500} text={`Зарплата сотрудника: `}/>
                <Typography size={21} weight={600} text={`${salary.total_amount} тг`}/>
            </Block>
        }

    </>)
}