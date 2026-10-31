import React, {useEffect, useState} from "react";
import {Loading} from "../../../widgets/Loading";
import {Block, GroupInput, Typography} from "../../../shared/ui";

import styles from './select.module.css'
import {$api} from "../../../app/http";

const API_URL = process.env.API_URL_DEV

export function SelectIncomeProduct({ clientId=0, selected, onChange= f=>f}) {

    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState([])


    const getProducts = async () => {
        setIsLoading(true);
        try {
            const response = await $api.get(`/relations/${clientId}/products`);
            console.log('SELECT INCOME CLIENT PRODUCTS:', response.data);

            setProducts(response.data.products); // Ожидается, что данные находятся в `response.data.products`
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching data products:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    function onSelect(productId) {
        const obj = products.find( p => p.id == productId)

        onChange(obj)
    }

    useEffect(() => {
        (async () => {
            await getProducts()
        })()
    }, [clientId])

    // useEffect(() => {
    //     console.log('SELECT INCOME CLIENT PRODUCTS :',products);
    // }, [products]);

    if (isLoading) {
        return <Loading />
    }

    if (products.length < 1) {
        return (<>
            <Block marginTop={15}>
                <Typography text={'Вы не добавили товары по данному клиенту.'}/>
            </Block>
        </>)
    }

    return (<>
        <GroupInput>
            <label>Укажите товар: </label>
            <select className={styles.select} name={'productId'} id="productId" onChange={e => onSelect(e.target.value)}>
                <option value={0} disabled selected>Выберите товар</option>
                {products.map( (p, key) => {
                    return <option key={key} value={p.id}>{p.name}</option>
                }) }
            </select>
        </GroupInput>
    </>)
}