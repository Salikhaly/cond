import React, {useEffect, useState} from "react";
import {useLocation, useParams} from "react-router-dom";
import {useAppContext} from "../app/provider/AppContextProvider";
import {Block, Box, Button, Grid, Typography} from "../shared/ui";
import useToggle from "../shared/hooks/useToggle";
import {AddProducts} from "../features/relations/AddProducts/AddProducts";
import {ProductItem} from "../entities/products/item/ProductItem";
import {Loading} from "../widgets/Loading";

export function OneRelationPage({}) {

    const location = useLocation();
    const { state } = location; // Получаем переданные данные из состояния

    const { id } = useParams();

    const { relationsHandler } = useAppContext()
    const { relationsProducts, getRelationsProducts, isLoading } = relationsHandler

    // const [products, setProducts] = useState([])

    useEffect(() => {
        (async () => {
            await getRelationsProducts({relationId: state.id})
            // setProducts(res.products)
        })()
    }, []);

    useEffect(() => {
        console.log('RELATIONS PRODUCTS DATA', relationsProducts)
    }, [relationsProducts]);

    const [addProductModal, toggleAddProductModal] = useToggle()

    if (isLoading) {
        return <Loading />
    }

    return (<Box isScrollable={true}>
        <Block padding={20}>
            <Block marginBottom={10}>
                <Typography size={24} weight={700} text={`${state.category === 'clients' ? 'Клиент' : 'Поставщик'}`}/>
                <Typography size={24} weight={700} text={state.name}/>
                {/*<Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>*/}
            </Block>

            {addProductModal && <AddProducts addedProducts={relationsProducts} relationId={state.id} onClose={toggleAddProductModal}/>}

            <Block>
                <Button onClick={toggleAddProductModal}>Добавить товар</Button>
            </Block>
        </Block>


        <Block padding={'0 20px'} marginTop={10} marginBottom={15}>
            <Typography size={16} weight={400} text={relationsProducts.length < 1 ? `Нет присвоенных товаров. Добавьте.` : `Всего ${relationsProducts.length} товаров`}/>
        </Block>

        <Block marginTop={10}>

            {/*<Grid>*/}
                { relationsProducts.map(i => {
                    return <ProductItem relationId={state.id} isPrice={true} onClick={f=>f} clickable={false} item={i} />
                }) }
            {/*</Grid>*/}
        </Block>

    </Box>)
}