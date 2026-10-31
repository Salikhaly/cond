import React, {useEffect, useState} from "react";
import {Block, Button, Grid, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import DeleteIcon from "../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";
import AddIcon from "../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {ProductItem} from "../../../entities/products/item/ProductItem";
import {Loading} from "../../../widgets/Loading";
import {Search} from "../../../widgets/Search/Search";

export function AddProducts({ addedProducts=[], relationId=null, onClose=f=>f}) {

    const { productsHandler, relationsHandler } = useAppContext()
    const { products, getProducts, isLoading } = productsHandler
    const [searchText, setSearchText] = useState('')
    const [filteredItems, setFilteredItems] = useState([])

    const { addProduct, getRelationsProducts } = relationsHandler

    const [selectedProduct, setSelectedProduct] = useState(null)

    const [price, setPrice] = useState(null)

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

    function isAddedProduct(item) {
        return addedProducts.some(added => item.id === added.id)
    }

    async function onSave() {
        if ( !price ) {
            console.log('SOME VALIDATION ERROR in price')
            return
        }

        const response = await addProduct({productId:selectedProduct.id, relationId, price})
        // console.log('PRODUCT UPDATE', response)
        await getRelationsProducts({relationId})
    }
    async function addHandle() {
        await onSave()
        onClose()
    }

    if (isLoading) {
        return <Loading />
    }

    return (<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Присвоить товар'} />
            </Block>
            {!selectedProduct ?
                <Block isAlignCenter={true}>
                    <Block marginTop={5} marginBottom={10}>
                        <Search searchText={searchText} setSearchText={setSearchText} />
                    </Block>

                    {/*<Grid>*/}
                        { searchText && filteredItems.map(i => {
                            return <ProductItem isAdded={isAddedProduct(i)} isSelectBtn={true} onClick={setSelectedProduct} clickable={false} item={i} />
                        }) }
                        { !searchText && products.map(i => {
                            return <ProductItem isAdded={isAddedProduct(i)} isSelectBtn={true} onClick={setSelectedProduct} clickable={false} item={i} />
                        })}
                    {/*</Grid>*/}
                </Block>

                : <Block>
                    {selectedProduct?.image && <img src={selectedProduct?.image} alt="Предпросмотр" width="200" />}
                    <GroupInput>
                        <label>Название</label>
                        <Input
                            type={'text'}
                            disabled
                            value={selectedProduct.name}
                            required
                        />
                    </GroupInput>

                    <GroupInput>
                        <label>Укажите цену</label>
                        <Input
                            name={'price'}
                            type={'number'}
                            onChange={e => setPrice(e.target.value)}
                            value={price}
                            placeholder={'Введите цену товара'}
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