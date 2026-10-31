import React, {useEffect, useState} from "react";
import {Block, Button, Typography} from "../../shared/ui";
import useToggle from "../../shared/hooks/useToggle";
import {AdvanceAdd} from "../../features/salary/addAdvance/AdvanceAdd";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {AdvanceItem} from "../../entities/advance/item/AdvanceItem";
import {Loading} from "../Loading";
import {$api} from "../../app/http";

const API_URL = process.env.API_URL_DEV

export function Advances({ salaryData }) {

    const [isAdvanceAddModal, toggleAdvanceAddModal] = useToggle()

    // const { salaryHandler } = useAppContext()
    // const { advances, , isLoading } = salaryHandler

    const [advances, setAdvances] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    const [isSalLoading, setIsSalLoading] = useState(false)

    const [salary, setSalary] = useState(null)
    const getSalary = async () => {
        setIsSalLoading(true);
        try {
            const response = await $api.get(`/salaries/${salaryData.id}`);
            console.log('FETCH SALARIES result.data:', response.data);

            setSalary(response.data); // Предполагается, что данные зарплаты находятся в `response.data`
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching salary data:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsSalLoading(false);
        }
    };

    const getAdvances = async () => {
        setIsLoading(true);
        try {
            const response = await $api.get(`/salaries/advances/${salaryData.id}`);
            console.log('FETCH ADVANCES result.data:', response.data);

            setAdvances(response.data);
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching advances:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или самого запроса
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        (async () => {
            await getSalary()
            await getAdvances()
        })()

    }, [salaryData]);

    useEffect(() => {
        console.log("CHECKKKK advances", advances)

    }, [advances]);

    if (isLoading || isSalLoading) {
        return <Loading />
    }

    return (<>
        { isAdvanceAddModal && <AdvanceAdd getSalary={getSalary} salaryId={salary.id} onClose={toggleAdvanceAddModal}/> }


        {salary &&
            <Block marginTop={20} marginBottom={10}>
                <Typography size={18} weight={500} marginBottom={6} text={`Выданные авансы: ${salary.advanced_amount}`}/>
                <Typography size={18} weight={500} text={`Доступно к выдаче: ${salary.total_amount - salary.advanced_amount}`}/>
            </Block>
        }
        <Block marginTop={0} marginBottom={10}>
            {advances.length < 1 &&
                <Typography size={16} weight={400} text={`Нет выданных авансов.`}/>
            }
            <Button marginTop={10} onClick={toggleAdvanceAddModal} disabled={salary?.total_amount == salary?.advanced_amount}>Выдать аванс</Button>
        </Block>

        {advances.map( (a, key) => {

            return <AdvanceItem getSalary={getSalary} salaryId={salary.id} key={key} item={ a } />
        })}

    </>)
}
