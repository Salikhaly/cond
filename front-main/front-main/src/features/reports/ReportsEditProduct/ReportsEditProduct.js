import React, {useState} from "react";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {Block, Button, Grid, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {Search} from "../../../widgets/Search/Search";
import {ProductItem} from "../../../entities/products/item/ProductItem";
import {Loading} from "../../../widgets/Loading";

export function ReportsEditProduct({ selectedProduct, reportId=0, onClose=f=>f, getProducts=f=>f}) {

    console.log('REPORTS PRODUCT ITEM ReportsEditProduct reportId', reportId)

    const { reportsHandler, authHandler } = useAppContext()
    const {user} = authHandler
    const { updateReportProduct } = reportsHandler

    const [isLoading, setIsLoading] = useState(false)

    const options = [
        {value: 'kg', label: 'КГ'},
        {value: 'piece', label: 'ШТ'}
    ]
    const [measure, setMeasure] = useState(selectedProduct.measure || null)
    const [quantity, setQuantity] = useState(selectedProduct.quantity || null)


    async function onUpdate() {
        if (measure == '') {
            console.log('SOME VALIDATION ERROR in ReportsEditProduct')
            return
        }
        if (quantity == '') {
            console.log('SOME VALIDATION ERROR in ReportsEditProduct')
            return
        }
        const response = await updateReportProduct({reportId, productId: selectedProduct.productId, measure, quantity})
        await getProducts()
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    if (isLoading) {
        return <Loading />
    }

    return (<>

        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменить детали'} />
            </Block>


            <Block>

                {selectedProduct?.image && <img src={selectedProduct?.image} alt="Предпросмотр" width="200" />}

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Название</label>
                    <Input
                        type={'text'}
                        disabled
                        value={selectedProduct.product.name}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}></Block>


                <GroupInput>
                    <label>Ед. измерения: {measure === 'kg' ? 'КГ' : 'ШТ' }</label>
                    {/*<select name={'measure'} id="measure" onChange={e => setMeasure(e.target.value)}>*/}
                    {/*    /!*<option value={''} disabled>Выберите ед.измерения</option>*!/*/}
                    {/*    {options.map( (o, key) => {*/}
                    {/*        return <option value={o.value}>{o.label}</option>*/}
                    {/*    }) }*/}
                    {/*</select>*/}
                    {/*<Input*/}
                    {/*    name={'price'}*/}
                    {/*    type={'number'}*/}
                    {/*    onChange={e => setMeasure(e.target.value)}*/}
                    {/*    value={measure}*/}
                    {/*    placeholder={'Введите ед. измерения'}*/}
                    {/*    required*/}
                    {/*/>*/}
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Укажите количество</label>
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