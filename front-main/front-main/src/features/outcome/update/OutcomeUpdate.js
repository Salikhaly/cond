import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {Loading} from "../../../widgets/Loading";
import {$api} from "../../../app/http";

const API_URL = process.env.API_URL_DEV

export function OutcomeUpdate({ data, outcomeId=0, onClose=f=>f}) {

    const { outcomeHandler } = useAppContext()
    const { updateOutcome, getOutcomes } = outcomeHandler

    const [isCatLoading, setIsCatLoading] = useState(false)
    const [categories, setCategories] = useState([])


    const [name, setName] = useState(data.name)
    const [recipient, setRecipient] = useState(data.recipient)
    const [weight, setWeight] = useState(data.weight)
    const [price, setPrice] = useState(data.unitPrice)
    const [quantity, setQuantity] = useState(data.quantity)
    const [date, setDate] = useState(new Date(data.date).toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState(data.outcome_category.id)
    const [supplier, setSupplier] = useState(data.businessRelationId)

    const getCategories = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get('/outcome/categories');
            console.log('!1111111111 result.data:', response.data[0]?.id);

            setCategories(response.data); // Ожидается, что категории находятся в `response.data`.
        } catch (error) {
            if (error.response) {
                // Сервер вернул ошибку (4xx, 5xx).
                console.error('Error fetching categories:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios.
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsCatLoading(false);
        }
    };

    function isValidDate(dateString) {
        const date = new Date(dateString);
        console.log('DATE', dateString, date, isNaN(date.getTime()), isNaN(1234), isNaN('asdasd'))
        return isNaN(date.getTime());
    }
    async function onUpdate() {
        if (name == '' || recipient == '') {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME')
            return
        }
        if ( isValidDate(date) ) {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME: date not valid')
            return
        }
        if ( isNaN(Number(weight)) || isNaN(Number(price)) || isNaN(Number(quantity)) ) {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME: weight, price, quantity must be numbers')
            return
        }
        if (Number(weight) < 0 || Number(price) < 0 || Number(quantity) < 0) {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME: weight, price, quantity must be > 0')
            return
        }

        console.log('~~~~~~~~ UPDATE OUTCOME', { outcomeId, name, recipient, weight: Number(weight), unitPrice: Number(price), quantity: Number(quantity), outcomeCategoryId: Number(categoryId), date: new Date(date) } )

        const response = await updateOutcome({ outcomeId, name, recipient, weight: Number(weight), unitPrice: Number(price), quantity: Number(quantity), outcomeCategoryId: Number(categoryId), date: new Date(date)  })
        console.log('OUTCOME UPDATE', response)
        await getOutcomes()
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    useEffect(() => {
        (async () => {
            await getCategories()
        })()
        console.log('OUTCOME ITEM', outcomeId)
    }, [])

    useEffect(() => {
        console.log('CATEGORY ID', categoryId)
    }, [categoryId]);

    if (isCatLoading) {
        return <Loading />
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение элемента расходов'} />

                <GroupInput>
                    <label>Укажите категорию: </label>
                    <select name={'categoryId'} id="categoryId" onChange={e => setCategoryId(e.target.value)}>
                        <option value={0} disabled>Выберите категорию</option>
                        {categories.map( (c, key) => {
                            return <option selected={c.id == categoryId} key={key} value={c.id}>{c.name}</option>
                        }) }
                    </select>
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Получатель (поставщик/компания): </label>
                    <Input
                        name={'recipient'}
                        type={'text'}
                        onChange={e => setRecipient(e.target.value)}
                        value={recipient}
                        placeholder={'Введите Получателя'}
                        required
                        disabled={supplier}
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Название: </label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите Название'}
                        required
                        disabled={supplier}
                    />
                </GroupInput>

                <GroupInput>
                    <label>Дата: </label>
                    <Input
                        name={'date'}
                        type={'date'}
                        onChange={e => setDate(e.target.value)}
                        value={date}
                        placeholder={'Введите Дату'}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Вес (необязательно): </label>
                    <Input
                        name={'weight'}
                        type={'number'}
                        onChange={e => setWeight(e.target.value)}
                        value={weight}
                        placeholder={'Введите вес'}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Цена за единицу: </label>
                    <Input
                        name={'price'}
                        type={'numeric'}
                        onChange={e => setPrice(e.target.value)}
                        value={price}
                        placeholder={'Введите цену'}
                        required
                        disabled={supplier}
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Количество: </label>
                    <Input
                        name={'quantity'}
                        type={'number'}
                        onChange={e => setQuantity(e.target.value)}
                        value={quantity}
                        placeholder={'Введите количество'}
                        required
                    />
                </GroupInput>
            </Block>

            <GroupButtons top={20}>
                <Button onClick={updateHandle}>Сохранить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}