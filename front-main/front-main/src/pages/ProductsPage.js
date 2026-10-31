import React, {useEffect, useState} from "react";
import {Block, Box, Button, Input, Typography} from "../shared/ui";
import {Products} from "../widgets/Products/Products";
import SearchIcon from '../shared/assets/icons/search_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import {ProductCreate} from "../features/products/create/ProductCreate";
import useToggle from "../shared/hooks/useToggle";
import {useAppContext} from "../app/provider/AppContextProvider";
import {Loading} from "../widgets/Loading";
import {Search} from "../widgets/Search/Search";

// const items = [
//     {name: 'Название продукта', images: ['https://as.fishki.net/upload/post/2020/11/01/99243613/gallery/99243613.jpg']},
//     {name: 'Длинное название продукта', images: ['https://cdn.culture.ru/images/afa3022a-1d17-5f61-8e07-9057ba6fbc44']},
//     {name: 'Продукт', images: ['https://avatars.mds.yandex.net/i?id=330c572fe189eb6ab8b1966e26764a17_l-7174559-images-thumbs&n=13']},
//     {name: 'Некоторый продукт', images: ['https://avatars.mds.yandex.net/i?id=3c7b4824c44efcf6b23daf9717d6a391_l-4935575-images-thumbs&n=13']},
//     {name: 'Очень длинное название продукта', images: ['https://i.pinimg.com/736x/16/65/b5/1665b592ce227dc6109c6b4ec87d9b12.jpg']},
//     {name: 'Название', images: ['https://api.rbsmi.ru/attachments/d013b0cafe5617bb99ba82185bf55afdcee5da33/store/crop/0/0/1024/768/1600/0/0/c3dc15e444e9f1bc675796a85727068797448fb283826ef8505553946de4/b2338d42ed90e4b68374f7a05bd8c683.jpg']},
// ]


export function ProductsPage() {


    const { productsHandler } = useAppContext()
    const { products, getProducts, isLoading} = productsHandler

    const [searchText, setSearchText] = useState('')
    const [filteredItems, setFilteredItems] = useState([])

    useEffect(() => {
        (async () => {
            await getProducts()
        })()
    }, []);
    useEffect(() => {
        // console.log('SEARCH TEXT', searchText)
        setFilteredItems(products.filter(item =>
            item.name.toLowerCase().includes(searchText.toLowerCase())
        ))
    }, [searchText]);

    const [isProductCreateModal, toggleProductCreate] = useToggle()

    if (isLoading) {
        return <Loading/>
    }

    return (<Box isScrollable={true}>

        <Block padding={20}>
            {isProductCreateModal && <ProductCreate onClose={toggleProductCreate}/>}

            <Block marginBottom={10}>
                <Typography size={24} weight={700} text={'Товары'}/>
                <Button width={'fit-content'} marginTop={10} onClick={toggleProductCreate}>Добавить</Button>
                {/*<Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>*/}
            </Block>

            <Search searchText={searchText} setSearchText={setSearchText} />
        </Block>

        <Block>
            <Products items={searchText ? filteredItems: products} size={products.length}/>
        </Block>


    </Box>)
}