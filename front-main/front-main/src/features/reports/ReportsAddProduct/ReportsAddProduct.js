import React, {useEffect, useState} from "react";
import {Block, Button, Grid, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import DeleteIcon from "../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";
import AddIcon from "../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {ProductItem} from "../../../entities/products/item/ProductItem";
import {Loading} from "../../../widgets/Loading";
import {Search} from "../../../widgets/Search/Search";

export function ReportsAddProduct({ reportId=null, addedProducts=[], onClose= f=>f, getReportProducts=f=>f}) {

    const [selectedProduct, setSelectedProduct] = useState(null)

    const { productsHandler, reportsHandler } = useAppContext()
    const { products, getProducts, isLoading } = productsHandler
    const [searchText, setSearchText] = useState('')
    const [filteredItems, setFilteredItems] = useState([])

    const { addReportProduct } = reportsHandler


    const options = [
        {value: 'kg', label: 'КГ'},
        {value: 'piece', label: 'ШТ'}
    ]
    const [measure, setMeasure] = useState(options[0].value)
    const [quantity, setQuantity] = useState('')



    useEffect(() => {
        (async () => {
            await getProducts()
        })()
    }, [])

    useEffect(() => {
        // console.log('SEARCH TEXT', searchText)
        setFilteredItems(products.filter(item =>
            item.name.toLowerCase().includes(searchText.toLowerCase())
        ))
    }, [searchText]);

    async function onSave() {
        if ( !measure ) {
            console.log('SOME VALIDATION ERROR in price')
            return
        }
        if ( !quantity ) {
            console.log('SOME VALIDATION ERROR in price')
            return
        }

        const response = await addReportProduct({productId:selectedProduct.id, reportId, measure, quantity})
        // console.log('PRODUCT UPDATE', response)
        await getReportProducts()
    }
    async function addHandle() {
        await onSave()
        onClose()
    }

    if (isLoading) {
        return <Loading />
    }

    function isAddedProduct(item) {
        return addedProducts.some(added => item.id === added.productId)
    }

    return (<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Выберите товар'} />
            </Block>
            {!selectedProduct ?
                <Block isAlignCenter={true}>
                    <Block marginTop={5} marginBottom={10}>
                        <Search searchText={searchText} setSearchText={setSearchText} />
                    </Block>

                    {/*<Grid>*/}
                        { searchText && filteredItems.map( (i, key) => {
                            return <ProductItem key={key} isAdded={isAddedProduct(i)} isSelectBtn={true} onClick={setSelectedProduct} clickable={false} item={i} />
                        }) }
                        { !searchText && products.map( (i, key) => {
                            return <ProductItem key={key} isAdded={isAddedProduct(i)} isSelectBtn={true} onClick={setSelectedProduct} clickable={false} item={i} />
                        })}
                    {/*</Grid>*/}
                </Block>

                : <Block>

                    {selectedProduct?.image && <img src={selectedProduct?.image} alt="Предпросмотр" width="200" />}

                    <Block marginTop={15}></Block>

                    <GroupInput>
                        <label>Название</label>
                        <Input
                            type={'text'}
                            disabled
                            value={selectedProduct.name}
                            required
                        />
                    </GroupInput>

                    <Block marginTop={15}></Block>

                    <GroupInput>
                        <label>Укажите ед. измерения</label>
                        <select name={'measure'} id="measure" onChange={e => setMeasure(e.target.value)}>
                            {/*<option value={''} disabled>Выберите ед.измерения</option>*/}
                            {options.map( (o, key) => {
                                return <option key={key} value={o.value}>{o.label}</option>
                            }) }
                        </select>
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
                            name={'price'}
                            type={'number'}
                            onChange={e => setQuantity(e.target.value)}
                            value={quantity}
                            placeholder={'Введите количество'}
                            required
                        />
                    </GroupInput>

                </Block>
            }


            <GroupButtons top={20}>
                {selectedProduct && <Button onClick={addHandle}>Добавить</Button>}
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}