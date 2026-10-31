import React, {useEffect, useState} from "react";
import styles from './Products.module.css'
import {ProductItem} from "../../entities/products/item/ProductItem";
import {Block, Grid, Typography, Pagination, Input} from "../../shared/ui";
import {Loading} from "../Loading";
import {useAppContext} from "../../app/provider/AppContextProvider";
export function Products({ items=[], size=0 }) {



    // useEffect(() => {
    //     console.log('LIMIT', limit)
    //     setCurrentPage(1)
    // }, [limit])


    return (<div className={styles.Shop}>
        <div className={styles.Shop__info}>
            <div className={styles.Shop__total}>
                {/*Results: {totalItems} items*/}
                Количество: {items.length}
            </div>

            {/*<div className={styles.Shop__info__limit}>*/}
            {/*    <span>Show in one page</span>*/}
            {/*    <select name="" id="" onChange={e => setLimit(e.target.value)}>*/}
            {/*        <option value={20} selected={ limit == 20 }>20</option>*/}
            {/*        <option value={40} selected={ limit == 40 }>40</option>*/}
            {/*        <option value={60} selected={ limit == 60 }>60</option>*/}
            {/*        <option value={80} selected={ limit == 80 }>80</option>*/}
            {/*        <option value={100} selected={ limit == 100 }>100</option>*/}
            {/*    </select>*/}
            {/*</div>*/}
        </div>

        {size < 1 &&
            <Block marginTop={12} padding={'0 20px'}>
                <Typography size={16} weight={400} text={`Нет товаров. Добавьте.`}/>
            </Block>
        }
        {items.length < 1 && size > 0 &&
            <Block marginTop={12} padding={'0 20px'}>
                <Typography size={16} weight={400} text={`По поисковому запросу ничего не найдено.`}/>
            </Block>
        }

        {/*<Grid>*/}
            {items.map(i => {
                return <ProductItem item={i} />
            })}
        {/*</Grid>*/}
        {/*<div className={styles.Shop__pagination__wrapper}>*/}

        {/*    { totalPages && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}*/}

        {/*</div>*/}
    </div>)
}