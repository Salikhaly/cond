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

export function FilterCategory({ filter, onChange=f=>f }) {



    const [isDrawerActive, setIsDrawerActive] = useState(false)

    const [buttonTitle, setButtonTitle] = useState('Категории')
    const [isApplied, setIsApplied] = useState(false)


    const [isCatLoading, setIsCatLoading] = useState(false)
    const [categories, setCategories] = useState([])




    const [selectedItems, setSelectedItems] = useState(filter.categories);
    const handleCheckboxChange = (item) => {
        setSelectedItems(filter.categories)
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
            setButtonTitle('Категории')
        }

        if (array.length > 0) {
            let buttonName = array[0].name;
            if (array.length > 1) {
                buttonName += `, +${array.length - 1}`
            }
            setButtonTitle(buttonName)
        }
    }

    const getCategories = async () => {
        setIsCatLoading(true);
        try {
            const response = await $api.get('/outcome/categories');
            console.log('!1111111111 result.data:', response.data[0]?.id);

            setCategories(response.data); // Ожидается, что данные категорий находятся в `response.data`.
        } catch (error) {
            if (error.response) {
                // Сервер вернул ошибку (4xx, 5xx)
                console.error('Error fetching data categories:', error.response.status, error.response.data);
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

        let obj = { categories: [] }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(false)
        close()
    }

    function onApply() {

        let obj = { categories: selectedItems }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(true)
        close()
    }

    useEffect(() => {
        setSelectedItems(filter.categories)
    }, [filter]);


    useEffect(() => {
        (async () => {
            await getCategories()
        })()
        setSelectedItems(filter.categories)
    }, []);


    useEffect(() => {
        console.log('FILTER CATEGORY: selectedItems', selectedItems)
        getButtonTitle(selectedItems)


    }, [selectedItems]);

    useEffect(() => {
        console.log('FILTER CATEGORY: button name', buttonTitle)

    }, [buttonTitle])

    if (isCatLoading) {
        return <Loading />
    }

    return (<>
        <Button borderRadius={16} variant={'outline'} width={'fit-content'} onClick={e => setIsDrawerActive(true)}>
            { isApplied  || buttonTitle !=='' ? buttonTitle : 'Категории' }

            {/*<ArrowDownIcon/>*/}
        </Button>

        <Drawer
            onClose={e => close()}
            isDrawerActive={isDrawerActive}
        >
            <Block width={'99%'} isInline justifyContent={'space-between'}>
                <Typography weight={600} size={21} bottom={18} align={'center'} text={'Фильтр категории'} />

                <Button onClick={close} size={'small'} variant={'clear'} isIconic>
                    <CloseIcon/>
                </Button>
            </Block>


            <div className={styles.list}>
                {categories.map( (c, key) => {
                    // if (c.id == 1) {return ''}
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