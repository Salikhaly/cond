import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {Loading} from "../../../widgets/Loading";
import {SelectIncomeClient} from "../../../entities/income/select/SelectIncomeClient";
import {SelectIncomeProduct} from "../../../entities/income/select/SelectIncomeProduct";



export function IncomeUpdate({ data, onClose=f=>f }) {

    const { incomeHandler } = useAppContext()
    const { updateIncome, getIncomes, isLoading } = incomeHandler

    const [client, setClient] = useState(data?.business_relation)
    const [product, setProduct] = useState(data?.product)
    const [weight, setWeight] = useState(data.totalWeight)
    const [quantity, setQuantity] = useState(data.quantity)
    const [date, setDate] = useState(data.date)


    function getTodayLocalDate() {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const localDate = new Date(today.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
        console.log('DAAAATE TOOOODAY', new Date(today.getTime() - offset * 60 * 1000).toISOString())

        setDate(localDate)
    }

    function isValidDate(dateString) {
        const date = new Date(dateString);
        console.log('DATE', dateString, date, isNaN(date.getTime()), isNaN(1234), isNaN('asdasd'))
        return isNaN(date.getTime());
    }

    async function onCreate() {
        if (!client || !product) {
            console.log('SOME VALIDATION ERROR in CREATE INCOME: product and client must selected')
            return
        }
        if ( isValidDate(date) ) {
            console.log('SOME VALIDATION ERROR in CREATE INCOME: date not valid')
            return
        }
        if ( isNaN(Number(weight)) || isNaN(Number(quantity)) ) {
            console.log('SOME VALIDATION ERROR in CREATE INCOME: weight, quantity must be numbers')
            return
        }
        if (Number(weight) < 0 || Number(quantity) < 0) {
            console.log('SOME VALIDATION ERROR in CREATE INCOME: weight, quantity must be > 0')
            return
        }

        console.log('~~~~~~~~ CREATE INCOME', { incomeId: Number(data.id), weight: Number(weight), quantity: Number(quantity), date: new Date(date) } )

        const response = await updateIncome({ incomeId: Number(data.id), weight: Number(weight), quantity: Number(quantity), date: new Date(date) })
        console.log('INCOME CREATE', response)
        await getIncomes()
    }


    async function createHandle() {
        await onCreate()
        onClose()
    }


    // useEffect(() => {
    //     console.log('INCOME CREATE CLIENT', client)
    // }, [client]);
    //
    //
    // useEffect(() => {
    //     console.log('INCOME CREATE PRODUCT', product)
    // }, [product]);


    useEffect(() => {
        getTodayLocalDate()

    }, []);

    useEffect(() => {
        console.log('INCOME UPDATE ITEM INFO: ', data)
    }, [data])

    useEffect(() => {
        const totalWeight = Number(quantity) * Number(product?.weight)
        setWeight(totalWeight)

    }, [quantity]);

    // useEffect(() => {
    //     if (categories.length > 0) {
    //         // setCategoryId(categories[0].id)
    //     }
    //     console.log('SETTTT CATEGORY ID', categories[0])
    // }, [categories]);

    if (isLoading) {
        return <Loading />
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение элемента доходов'} />

                <GroupInput>
                    <label>Клиент: </label>
                    <Input
                        type={'text'}
                        onChange={e => e}
                        value={client?.name}
                        required
                        disabled
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Клиент: </label>
                    <Input
                        type={'text'}
                        onChange={e => e}
                        value={product?.name}
                        required
                        disabled
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

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
                    <label>Общий вес: </label>
                    <Input
                        name={'weight'}
                        type={'number'}
                        // onChange={e => setWeight(e.target.value)}
                        value={weight}
                        placeholder={'Введите вес'}
                        required
                        disabled
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Цена за единицу: </label>
                    <Input
                        type={'numeric'}
                        onChange={e => e}
                        value={data.unitPrice}
                        placeholder={''}
                        required
                        disabled
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
                <Button onClick={createHandle}>Сохранить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}