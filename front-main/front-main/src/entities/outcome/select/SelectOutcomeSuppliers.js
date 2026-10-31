import React, {useEffect, useState} from "react";
import {Loading} from "../../../widgets/Loading";
import {GroupInput} from "../../../shared/ui";

import styles from './select.module.css'
import {$api} from "../../../app/http";

const API_URL = process.env.API_URL_DEV

export function SelectOutcomeSuppliers({ selected, onChange= f=>f}) {

    const [isCatLoading, setIsCatLoading] = useState(false)
    const [suppliers, setSuppliers] = useState([])


    const getSuppliers = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get('/relations/suppliers');
            console.log('SELECT OUTCOME SUPPLIERS:', response.data);

            setSuppliers(response.data); // Ожидается, что данные поставщиков находятся в `response.data`.
        } catch (error) {
            if (error.response) {
                // Сервер вернул ошибку (4xx, 5xx)
                console.error('Error fetching data suppliers:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsCatLoading(false);
        }
    };

    function onSelect(id) {

        const obj = suppliers.find( s => s.id == id)
        onChange(obj)

    }


    useEffect(() => {
        (async () => {
            await getSuppliers()
        })()
    }, [])

    if (isCatLoading) {
        return <Loading />
    }


    return (<>
        <GroupInput>
            <label>Укажите поставщика: </label>
            <select className={styles.select} name={'supplierId'} id="supplierId" onChange={e => onSelect(e.target.value)}>
                <option value={0} disabled selected>Выберите поставщика</option>
                {suppliers.map( (c, key) => {
                    return <option key={key} value={c.id}>{c.name}</option>
                }) }
            </select>
        </GroupInput>
    </>)
}