import React, {useEffect, useState} from "react";
import {Block, Button, Drawer, Typography} from "../../shared/ui";
import styles from './filter.module.css'
import ArrowDownIcon from '../../shared/assets/icons/keyboard_arrow_down_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import {SelectOutcomeCategories} from "../../entities/outcome/select/SelectOutcomeCategories";
import {Loading} from "../../widgets/Loading";
import {ItemCheckbox} from "../../entities/outcome/ItemCheckbox/ItemCheckbox";
import CloseIcon from '../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import {$api} from "../../app/http";

const API_URL = process.env.API_URL_DEV

export function FilterProducts({ filter, onChange=f=>f }) {



    const [isDrawerActive, setIsDrawerActive] = useState(false)

    const [buttonTitle, setButtonTitle] = useState('Категории')
    const [isApplied, setIsApplied] = useState(false)


    const [isCatLoading, setIsCatLoading] = useState(false)
    const [products, setProducts] = useState([])




    const [selectedItems, setSelectedItems] = useState(filter.products || []);
    const handleCheckboxChange = (item) => {
        setSelectedItems(filter.products)
        if (selectedItems.some(obj1 => obj1.id === item.id)) {
            // Если элемент уже выбран, убираем его из массива
            setSelectedItems(selectedItems.filter((i) => i.id != item.id));
        } else {
            // Если элемент не выбран, добавляем его в массив
            setSelectedItems([...selectedItems, item]);
        }

    };

    function getButtonTitle(array) {
        if (array.length < 1) {
            setButtonTitle('Товары')
        }

        if (array.length > 0) {
            let buttonName = array[0].name;
            if (array.length > 1) {
                buttonName += `, +${array.length - 1}`
            }
            setButtonTitle(buttonName)
        }
    }

    const getProducts = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get('/products');
            console.log('INCOME FILTER PRODUCTS:', response.data);

            setProducts(response.data);
        } catch (error) {
            if (error.response) {
                // Сервер вернул ошибку (4xx, 5xx)
                console.error('Error fetching data products:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsCatLoading(false);
        }
    };


    function close() {
        setIsDrawerActive(false)
    }

    function onReset() {
        setSelectedItems([])
        setButtonTitle('')

        let obj = { products: [] }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(false)
    }

    function onApply() {

        let obj = { products: selectedItems }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(true)
        close()
    }

    useEffect(() => {
        setSelectedItems(filter.products)
    }, [filter]);


    useEffect(() => {
        (async () => {
            await getProducts()
        })()
        setSelectedItems(filter.products)
    }, []);


    useEffect(() => {
        console.log('FILTER PRODUCTS: selectedItems', selectedItems)
        getButtonTitle(selectedItems)


    }, [selectedItems]);

    useEffect(() => {
        console.log('FILTER PRODUCTS: button name', buttonTitle)

    }, [buttonTitle])

    if (isCatLoading) {
        return <Loading />
    }

    return (<>
        <Button borderRadius={16} variant={'outline'} width={'fit-content'} onClick={e => setIsDrawerActive(true)}>
            { isApplied  || buttonTitle !=='' ? buttonTitle : 'Товары' }

            {/*<ArrowDownIcon/>*/}
        </Button>

        <Drawer
            onClose={e => close()}
            isDrawerActive={isDrawerActive}
        >
            <Block width={'99%'} isInline justifyContent={'space-between'}>
                <Typography weight={600} size={21} bottom={18} align={'center'} text={'Фильтр товары'} />

                <Button onClick={close} size={'small'} variant={'clear'} isIconic>
                    <CloseIcon/>
                </Button>
            </Block>


            <div className={styles.list}>
                {products.map( (c, key) => {
                    return <ItemCheckbox key={key} item={c} onCheck={handleCheckboxChange} isActive={selectedItems.some(obj1 => obj1.id === c.id)} />
                })}
            </div>



            <Block marginTop={20} isInline>
                <Button variant={'outline'} onClick={onReset}>Сбросить</Button>
                <Block width={'fit-content'} marginRight={10}></Block>
                <Button onClick={onApply}>Применить</Button>
            </Block>
        </Drawer>
    </>)
}