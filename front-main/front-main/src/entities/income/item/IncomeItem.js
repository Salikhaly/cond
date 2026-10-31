import React, {useEffect, useState} from "react";
import styles from './IncomeItem.module.css'
import {Block, Button, Grid, Typography} from "../../../shared/ui";
import useToggle from "../../../shared/hooks/useToggle";
import {ReportsAddProduct} from "../../../features/reports/ReportsAddProduct/ReportsAddProduct";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {ProductItem} from "../../products/item/ProductItem";
import {Loading} from "../../../widgets/Loading";
import DeleteIcon from "../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import EditIcon from "../../../shared/assets/icons/edit_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg";
import {OutcomeDelete} from "../../../features/outcome/delete/OutcomeDelete";
import {OutcomeUpdate} from "../../../features/outcome/update/OutcomeUpdate";
import {IncomeDelete} from "../../../features/income/delete/IncomeDelete";
import {IncomeUpdate} from "../../../features/income/update/IncomeUpdate";


const API_URL = process.env.API_URL_DEV

export function IncomeItem({ item }) {

    // const { outcomeHandler } = useAppContext()
    // const {  } = outcomeHandler


    useEffect(() => {
        console.log('INCOMES ITEM INFO:', item)
    }, [item])

    function isToday(date) {
        const today  = new Date();
        // today.setHours(0, 0, 0, 0);

        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    const [isIncomeItemDeleteModal, toggleIncomeItemDeleteModal] = useToggle()
    const [isIncomeItemUpdateModal, toggleIncomeItemUpdateModal] = useToggle()


    return (<div className={styles.ShopItem}>

        { isIncomeItemDeleteModal && <IncomeDelete incomeId={item?.id} onClose={toggleIncomeItemDeleteModal}/> }
        { isIncomeItemUpdateModal && <IncomeUpdate data={item} incomeId={item?.id} onClose={toggleIncomeItemUpdateModal}/> }

        <div className={styles.ShopItem__tools} onClick={f=>f}>
            {/*<img src={image} alt=""/>*/}
            <div className={styles.ShopItem__like}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleIncomeItemDeleteModal
                }><DeleteIcon/></button>
            </div>
            <div className={styles.ShopItem__edit}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleIncomeItemUpdateModal
                }><EditIcon/></button>
            </div>
        </div>

        <Block padding={10}>
            <div className={styles.ShopItem__name}>
                <Typography size={20} weight={600} color={'green'} text={`+ ${item?.totalAmount}`} marginBottom={3}/>
            </div>
            {/*<Typography size={18} weight={600} text={name} marginBottom={5}/>*/}

            <div className={styles.ShopItem__price_block}>
                <Block>
                    <div>
                        <Typography size={16} weight={500} text={'Клиент: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.business_relation?.name}`} marginBottom={3}/>
                        {item?.business_relation?.is_active === false && <Typography size={16} color={'grey'} weight={600} text={` (удалено)`} marginBottom={3}/>}
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={'Товар: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.product?.name}`} marginBottom={3}/>
                        {item?.product?.is_active === false && <Typography size={16} color={'grey'} weight={600} text={` (удалено)`} marginBottom={3}/>}

                    </div>

                    <div>
                        <Typography size={16} weight={500} text={'Вес коробки: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.weight} кг`} marginBottom={3}/>
                    </div>

                    <div>
                        <Typography size={16} weight={500} text={'Общий вес: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.totalWeight} кг`} marginBottom={3}/>
                    </div>

                    <div>
                        <Typography size={16} weight={500} text={'Цена за ед.: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.unitPrice} тг`} marginBottom={3}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={'Количество: '} marginBottom={0}/>
                        <Typography size={16} weight={600} text={item?.quantity} marginBottom={0}/>
                    </div>
                </Block>
                {/*<span className={styles.ShopItem__oldPrice}>{oldPrice}</span>*/}

            </div>
            <Block isInline={true}>
            </Block>
            {/*<Typography size={14} weight={500} color={'grey'} text={description} />*/}

            {/*<div className={styles.ShopItem__block}>*/}
            {/*    {rating && <Typography marginRight={10} size={14} weight={500} color={'grey'} text={'⭐' + rating} />}*/}
            {/*    {reviewsCount && <Typography size={14} weight={500} color={'grey'} text={reviewsCount} />}*/}
            {/*</div>*/}
        </Block>

    </div>)
}