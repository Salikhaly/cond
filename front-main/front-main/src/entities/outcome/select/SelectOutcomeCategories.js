import React, {useEffect, useState} from "react";
import {Loading} from "../../../widgets/Loading";
import {GroupInput} from "../../../shared/ui";

import styles from './select.module.css'
import {$api} from "../../../app/http";

const API_URL = process.env.API_URL_DEV

export function SelectOutcomeCategories({ selected, onChange=f=>f}) {

    const [isCatLoading, setIsCatLoading] = useState(false)
    const [categories, setCategories] = useState([])


    const getCategories = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get('/outcome/categories');
            console.log('!1111111111 result.data:', response.data[0]?.id);

            setCategories(response.data); // Предполагается, что данные категорий находятся в `response.data`
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching data categories:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsCatLoading(false);
        }
    };


    useEffect(() => {
        (async () => {
            await getCategories()
        })()
    }, [])

    if (isCatLoading) {
        return <Loading />
    }


    return (<>
        <GroupInput>
            <label>Укажите категорию: </label>
            <select className={styles.select} name={'categoryId'} id="categoryId" onChange={e => onChange(e.target.value)}>
                <option value={0} disabled selected>Выберите категорию</option>
                {categories.map( (c, key) => {
                    if (c.id == 1) {return ''}

                    return <option key={key} value={c.id}>{c.name}</option>
                }) }
            </select>
        </GroupInput>
    </>)
}