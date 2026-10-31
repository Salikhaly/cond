import React, {useEffect, useState} from "react";
import {Loading} from "../../../widgets/Loading";
import {GroupInput} from "../../../shared/ui";

import styles from './select.module.css'
import {$api} from "../../../app/http";

const API_URL = process.env.API_URL_DEV

export function SelectIncomeClient({ selected, onChange= f=>f}) {

    const [isLoading, setIsLoading] = useState(false)
    const [clients, setClients] = useState([])


    const getClients = async () => {
        setIsLoading(true);
        try {
            const response = await $api.get('/relations/clients');
            console.log('INCOME CREATE CLIENTS:', response.data[0]?.id);

            setClients(response.data); // Ожидается, что данные находятся в `response.data`
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching data clients:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    function onSelect(clientId) {
        const obj = clients.find( c => c.id == clientId)

        onChange(obj)
    }


    useEffect(() => {
        (async () => {
            await getClients()
        })()
    }, [])

    if (isLoading) {
        return <Loading />
    }


    return (<>
        <GroupInput>
            <label>Укажите клиента: </label>
            <select className={styles.select} name={'categoryId'} id="categoryId" onChange={e => onSelect(e.target.value)}>
                <option value={0} disabled selected>Выберите клиента</option>
                {clients.map( (c, key) => {
                    return <option key={key} value={c.id}>{c.name}</option>
                }) }
            </select>
        </GroupInput>
    </>)
}