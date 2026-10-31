import React, {useEffect, useState} from "react";
import styles from './OutcomeItem.module.css'
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


const API_URL = process.env.API_URL_DEV

export function OutcomeItem({ item }) {

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

    const [isOutcomeItemDeleteModal, toggleOutcomeItemDeleteModal] = useToggle()
    const [isOutcomeItemUpdateModal, toggleOutcomeItemUpdateModal] = useToggle()


    return (<div className={styles.ShopItem}>

        { isOutcomeItemDeleteModal && <OutcomeDelete outcomeId={item?.id} onClose={toggleOutcomeItemDeleteModal}/> }
        { isOutcomeItemUpdateModal && <OutcomeUpdate data={item} outcomeId={item?.id} onClose={toggleOutcomeItemUpdateModal}/> }

        <div className={styles.ShopItem__tools} onClick={f=>f}>
            {/*<img src={image} alt=""/>*/}
            <div className={styles.ShopItem__like}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleOutcomeItemDeleteModal
                }><DeleteIcon/></button>
            </div>
            <div className={styles.ShopItem__edit}>
                <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                    toggleOutcomeItemUpdateModal
                }><EditIcon/></button>
            </div>
        </div>

        <Block padding={10}>
            <div className={styles.ShopItem__name}>
                <Typography size={20} weight={600} color={'red'} text={`- ${item?.totalAmount}`} marginBottom={3}/>
            </div>
            <div className={styles.ShopItem__name}>
                {item.name}
            </div>
            {/*<Typography size={18} weight={600} text={name} marginBottom={5}/>*/}

            <div className={styles.ShopItem__price_block}>
                <Block>
                    <div>
                        <Typography size={16} weight={500} text={'Поставщик/компания: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.recipient}`} marginBottom={3}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} color={item?.outcome_category.is_active === false ? 'black' : 'black'} text={'Категория: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={item?.outcome_category.is_active === false ? '(удалено) ' : ''} color={'grey'} marginBottom={3}/>
                        <Typography size={16} weight={600} color={item?.outcome_category.is_active === false ? 'black' : 'black'} text={item?.outcome_category.name} marginBottom={3}/>
                    </div>
                    {item?.weight > 0 && <>
                        <div>
                            <Typography size={16} weight={500} text={'Вес: '} marginBottom={3}/>
                            <Typography size={16} weight={600} text={`${item?.weight} кг`} marginBottom={3}/>
                        </div>
                    </>}
                    <div>
                        <Typography size={16} weight={500} text={'Цена за ед.: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={`${item?.unitPrice} тг`} marginBottom={3}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={'Количество: '} marginBottom={0}/>
                        <Typography size={16} weight={600} text={item?.quantity} marginBottom={0}/>
                    </div>
                    {item?.advance && <div>
                        <Typography size={16} weight={500} text={'Тип платежа: '} marginBottom={0}/>
                        <Typography size={16} weight={600} text={item?.advance.payment_type} marginBottom={0}/>
                    </div>}

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