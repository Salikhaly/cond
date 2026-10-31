import React, {useEffect, useState} from "react";
import {Loading} from "../../../widgets/Loading";
import {GroupInput} from "../../../shared/ui";

import styles from './select.module.css'

const API_URL = process.env.API_URL_DEV

export function SelectOutcomeProduct({ selected, supplierId=0, onChange= f=>f}) {

    const [isCatLoading, setIsCatLoading] = useState(false)
    const [products, setProducts] = useState([])


    const getProducts = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get(`/relations/${supplierId}/products`);
            console.log('RESPONSE SELECT OUTCOME PRODUCTS:', response.data);

            setProducts(response.data.products); // Ожидается, что данные продуктов находятся в `response.data.products`
        } catch (error) {
            if (error.response) {
                // Сервер вернул ошибку (4xx, 5xx).
                console.error('Error fetching data products:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios.
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsCatLoading(false);
        }
    };

    function onSelect(id) {

        const obj = products.find( p => p.id == id)
        onChange(obj)

    }


    useEffect(() => {

        (async () => {
            await getProducts()
        })()

        console.log('RESPONSE SELECT OUTCOME PRODUCTS: supplier id', supplierId)
    }, [supplierId])

    if (isCatLoading) {
        return <Loading />
    }


    return (<>
        <GroupInput>
            <label>Укажите товар: </label>
            <select className={styles.select} name={'productId'} id="productId" onChange={e => onSelect(e.target.value)}>
                <option value={0} disabled selected>Выберите товар</option>
                {products.map( (c, key) => {
                    return <option key={key} value={c.id}>{c.name}</option>
                }) }
            </select>
        </GroupInput>
    </>)
}