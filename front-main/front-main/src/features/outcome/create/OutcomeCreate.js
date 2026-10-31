import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {Loading} from "../../../widgets/Loading";
import {SelectOutcomeCategories} from "../../../entities/outcome/select/SelectOutcomeCategories";
import {SelectOutcomeSuppliers} from "../../../entities/outcome/select/SelectOutcomeSuppliers";
import styles from "../../filter/filter.module.css";
import {SelectOutcomeProduct} from "../../../entities/outcome/select/SelectOutcomeProduct";



export function OutcomeCreate({ onClose=f=>f }) {

    const { outcomeHandler } = useAppContext()
    const { createOutcome, getOutcomes } = outcomeHandler

    const [name, setName] = useState('')
    const [recipient, setRecipient] = useState('')
    const [weight, setWeight] = useState('')
    const [price, setPrice] = useState('')
    const [quantity, setQuantity] = useState('')
    const [date, setDate] = useState('')
    const [categoryId, setCategoryId] = useState()
    const [supplier, setSupplier] = useState(null)
    const [product, setProduct] = useState(null)

    const [selectedOption, setSelectedOption] = useState('list');

    function setType(type) {
        if (type === 'manual') {
            setSupplier(null)
            setProduct(null)
        } else {
            // setDate('')
        }
        setSelectedOption(type)
    }

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
        if (!categoryId) {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME: need a category')
            return
        }
        if (!quantity) {
            console.log('SOME VALIDATION ERROR in CREATE OUTCOME: need a quantity')
            return
        }
        if ((name == '' || recipient == '') && selectedOption == 'manual') {
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

        console.log('~~~~~~~~ CREATE OUTCOME', { name, recipient: recipient || supplier?.name, supplierId: supplier?.id, weight: Number(weight), unitPrice: Number(price), quantity: Number(quantity), outcomeCategoryId: Number(categoryId), date: new Date(date) } )

        const response = await createOutcome({ name, recipient: recipient || supplier?.name, supplierId: supplier?.id, weight: Number(weight), unitPrice: Number(price), quantity: Number(quantity), outcomeCategoryId: Number(categoryId), date: new Date(date)  })
        console.log('OUTCOME CREATE', response)
        await getOutcomes()
    }


    async function createHandle() {
        await onCreate()
        onClose()
    }


    useEffect(() => {
        console.log('CATEGORY ID', categoryId)
    }, [categoryId]);

    useEffect(() => {
        getTodayLocalDate()

    }, []);

    useEffect(() => {
        console.log('OUTCOME CREATE TAB TYPE:', selectedOption)
    }, [selectedOption]);

    useEffect(() => {
        console.log('OUTCOME CREATE SELECT SUPPLIER', supplier)
    }, [supplier]);

    useEffect(() => {
        console.log('OUTCOME CREATE SELECT PRODUCT', product)
        if (product) {
            setPrice(Number(product.price))
            setName(product.name)
        }
    }, [product]);

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Добавление расходов'} />


                <SelectOutcomeCategories selected={categoryId} onChange={setCategoryId}/>

                <Block marginTop={15}></Block>

                <Block>
                    <label>Укажите поставщика: </label>

                    <Block isInline justifyContent={'start'} padding={5}>
                        <Block width={'fit-content'} marginRight={25} isInline={true} isAlignCenter={true}>
                            <input
                                type="radio"
                                id="list"
                                name="list"
                                value="list"
                                checked={selectedOption == 'list'}
                                onChange={e => setType(e.target.value) }
                            />
                            <label className={styles.label} htmlFor="list">Из базы</label>
                        </Block>

                        <Block width={'fit-content'} isInline={true} isAlignCenter={true}>
                            <input
                                type="radio"
                                id="manual"
                                name="manual"
                                value="manual"
                                checked={selectedOption == 'manual'}
                                onChange={e => setType(e.target.value)}
                            />
                            <label className={styles.label} htmlFor="manual">Вручную</label>
                        </Block>
                    </Block>

                </Block>

                <Block marginTop={15}></Block>

                {selectedOption === 'list' && <SelectOutcomeSuppliers onChange={setSupplier}/>}


                {selectedOption === 'manual' && <GroupInput>
                    <label>Получатель (поставщик/компания): </label>
                    <Input
                        name={'recipient'}
                        type={'text'}
                        onChange={e => setRecipient(e.target.value)}
                        value={recipient}
                        placeholder={'Введите Получателя'}
                        required
                    />
                </GroupInput>}


                <Block marginTop={15}></Block>

                {supplier && <SelectOutcomeProduct supplierId={supplier.id} onChange={setProduct}/>}

                { selectedOption === 'manual' && <GroupInput>
                    <label>Название: </label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите Название'}
                        required
                    />
                </GroupInput>}


                <Block marginTop={15}></Block>

                { (selectedOption === 'manual' || (product && supplier && selectedOption ==='list')) && <>

                    <GroupInput>
                        <label>Дата (автоматически сегодня): </label>
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
                            value={product?.price || price }
                            placeholder={'Введите цену'}
                            required
                            disabled={product}
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
                </>}
            </Block>

            <GroupButtons top={20}>
                <Button onClick={createHandle}>Добавить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}