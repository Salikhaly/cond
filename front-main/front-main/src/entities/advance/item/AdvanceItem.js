import React, {useEffect, useState} from "react";
import styles from './AdvanceItem.module.css'
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
import {AdvanceDelete} from "../../../features/salary/deleteAdvance/AdvanceDelete";
import {AdvanceEdit} from "../../../features/salary/editAdvance/AdvanceEdit";


const API_URL = process.env.API_URL_DEV

export function AdvanceItem({ item, getSalary=f=>f, salaryId=0 }) {

    // const { outcomeHandler } = useAppContext()
    // const {  } = outcomeHandler


    function isToday(date) {
        const today  = new Date();
        // today.setHours(0, 0, 0, 0);

        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    const [isAdvanceItemDeleteModal, toggleAdvanceItemDeleteModal] = useToggle()
    const [isAdvanceItemUpdateModal, toggleAdvanceItemUpdateModal] = useToggle()


    return (<div className={styles.ShopItem}>

        { isAdvanceItemDeleteModal && <AdvanceDelete getSalary={getSalary} salaryId={salaryId} userId={item.userId} advanceId={item.id} onClose={toggleAdvanceItemDeleteModal}/> }
        { isAdvanceItemUpdateModal && <AdvanceEdit getSalary={getSalary} salaryId={salaryId} oldAmount={item.amount} data={item} userId={item.userId} advanceId={item.id} onClose={toggleAdvanceItemUpdateModal}/> }

        <div className={styles.ShopItem__tools} onClick={f=>f}>
            {/*<img src={image} alt=""/>*/}
            <div className={styles.ShopItem__like}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleAdvanceItemDeleteModal
                }><DeleteIcon/></button>
            </div>
            <div className={styles.ShopItem__edit}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleAdvanceItemUpdateModal
                }><EditIcon/></button>
            </div>
        </div>

        <Block padding={10}>
            <div className={styles.ShopItem__name}>
                {item.amount}
            </div>

            <div>
                <Typography size={16} weight={500} text={'Тип платежа: '} marginBottom={3}/>
                <Typography size={16} weight={600} text={`${item?.payment_type}`} marginBottom={3}/>
            </div>
            {/*<Typography size={18} weight={600} text={name} marginBottom={5}/>*/}

            <div className={styles.ShopItem__price_block}>
                <Block>
                    {/*<div>*/}
                    {/*    <Typography size={16} weight={500} text={'Поставщик/компания: '} marginBottom={3}/>*/}
                    {/*    <Typography size={16} weight={600} text={`${item?.recipient}`} marginBottom={3}/>*/}
                    {/*</div>*/}
                    {/*<div>*/}
                    {/*    <Typography size={16} weight={500} text={'Цена за ед.: '} marginBottom={3}/>*/}
                    {/*    <Typography size={16} weight={600} text={`${item?.unitPrice} тг`} marginBottom={3}/>*/}
                    {/*</div>*/}
                    {/*<div>*/}
                    {/*    <Typography size={16} weight={500} text={'Количество: '} marginBottom={0}/>*/}
                    {/*    <Typography size={16} weight={600} text={item?.quantity} marginBottom={0}/>*/}
                    {/*</div>*/}
                </Block>
                {/*<span className={styles.ShopItem__oldPrice}>{oldPrice}</span>*/}

            </div>
            <Block isInline={true}>
            </Block>

        </Block>

    </div>)
}