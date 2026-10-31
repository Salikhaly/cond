import React, {useEffect, useRef, useState} from "react";
import {Block, Input, Button, Loader, Typography, Chip} from "../../shared/ui";

import SearchIcon from '../../shared/assets/icons/search_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import styles from './SearchInHeader.module.css'
import {Loading} from "../../widgets/Loading";
import {useAppContext} from "../../app/provider/AppContextProvider";
export function SearchInHeader({}) {

    const { productHandler } = useAppContext()
    const { setShopItems, setTotalPages, limit, currentPage, setTotalItems, isProductsLoading, setIsProductsLoading } = productHandler

    const [showTooltip, setShowTooltip] = useState(false);

    const [finderType, setFinderType] = useState('by_title_descrs')
    useEffect(() => {
        console.log('SELECT', finderType)
    }, [finderType]);

    const [selectedTags, setSelectedTags] = useState([])

    const [resTags, setResTags] = useState([])

    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const delay = 500; // Adjust the debounce delay in milliseconds
    const [totalSearchItems, setTotalSearchItems] = useState(null);

    let abortController = new AbortController();
    const debounce = (func, wait) => {
        let timeoutId;

        return function () {
            const context = this;
            const args = arguments;

            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    };

    const debouncedSearch = debounce(search, 300); // Создаем дебаунсированную версию функции search

    // useEffect(() => {
    //
    //     console.log('RESULT',result.tags)
    // }, [])

    async function search(term) {
        // Здесь ваша логика поиска
        setIsLoading(true);
        setSearchResults([])
        if (finderType === 'by_tags') {
            // Отменяем предыдущий запрос перед новым
            // abortController.abort();
            try {
                const response = await fetch(`http://localhost:3043/api/tags/search?query=${term}`, {
                    signal: abortController.signal
                });

                const result = await response.json();
                // console.log(result);

                setResTags(result.tags)
                // setTotalSearchItems(result.totalItems);
            } catch (error) {
                // console.error('Ошибка при загрузке данных:', error);
            }
        } else if (finderType === 'by_title_descrs') {

            getProducts()

        }



        setIsLoading(false);

    }

    async function getProducts() {
        setIsProductsLoading(true)
        // Отменяем предыдущий запрос перед новым
        // abortController.abort();
        try {
            const response = await fetch(`http://localhost:3043/api/products/search?query=${searchTerm}&limit=${limit}&page=${currentPage}`, {
                signal: abortController.signal
            });

            const result = await response.json();
            console.log('PRODUCTS FETCH',result);
            setShopItems(result.products)
            setTotalPages(result.totalPages)
            setTotalItems(result.totalItems)
            // setResTags(result.tags)
            // setTotalSearchItems(result.totalItems);
        } catch (error) {
            // console.error('Ошибка при загрузке данных:', error);
        }
        setIsProductsLoading(false)
    }

    useEffect(() => {
        getProducts()
    }, [currentPage, limit]);

    useEffect(() => {
        // console.log(searchTerm);

        // Отменяем предыдущий запрос
        abortController.abort();

        abortController = new AbortController();

        if (searchTerm) {
            // Вызываем дебаунсированную функцию
            debouncedSearch(searchTerm);
        }

        // Очищаем AbortController при размонтировании компонента
        return () => {
            abortController.abort();
        };
    }, [searchTerm]);



    const inputRef = useRef(null);
    const handleInputClick = () => {
        setShowTooltip(true);
    };
    // Обработчик клика вне инпута или тултипа для закрытия тултипа
    const handleClickOutside = (event) => {
        if (inputRef.current && !inputRef.current.contains(event.target)) {
            setShowTooltip(false);
        }
    };
    // Добавление и удаление обработчика событий клика вне элемента
    useEffect(() => {
        getProducts()

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };


    }, []);

    return (<div className={styles.SearchInHeader__wrapper} ref={inputRef}>

        {isProductsLoading && <Loading/>}

        <Block width={'100%'} isInline={true}>
            <select className={styles.SearchInHeader__select} onChange={e => setFinderType(e.target.value)}>
                <option value="by_tags" selected={finderType === 'by_tags'}>by tags</option>
                <option value="by_title_descrs" selected={finderType === 'by_title_descrs'}>by title, descr</option>
            </select>
            <Input
                paddingLeft={130}
                borderRadius={'6px 0 0 6px'}
                value={searchTerm}
                placeholder={'Search something...'}
                type={'text'}
                name={'search'}
                required
                onChange={ (e) => setSearchTerm(e.target.value) }
                onClick={handleInputClick}
                autocomplete={"off"}
                // onFocus={(e) => e.target.blur()}
            />
            <Button borderRadius={'0 6px 6px 0'} width={'fit-content'} isIconic><SearchIcon /></Button>
        </Block>
        {showTooltip && (
            <div className={`
                ${styles.SearchInHeader__tooltip}
                ${!showTooltip && styles['SearchInHeader__tooltip--hide']}
            `}>
                <div className={styles.SearchInHeader__tooltip_content}>
                    {searchTerm === '' && <Typography text={'Type something...'} color={'grey'}/> }
                    {isLoading
                        ? <Typography text={'Loading...'} color={'grey'}/>
                        : resTags.length > 0 && resTags.map(r => {
                        return `${r.name}, `
                    })
                    }

                </div>
            </div>
        )}
    </div>)
}