import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Block,Typography,Button} from "../../../shared/ui";
import styles from './ProductItem.module.css'
import LikeIcon from '../../../shared/assets/icons/Property 1=heart.svg'
import useToggle from "../../../shared/hooks/useToggle";
import {ProductUpdate} from "../../../features/products/update/ProductUpdate";
import {ProductDelete} from "../../../features/products/delete/ProductDelete";
import DeleteIcon from '../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import {EditProductPrice} from "../../../features/relations/EditProductPrice/EditProductPrice";
import {DeleteRelationProduct} from "../../../features/relations/DeleteRelationProduct/DeleteRelationProduct";
import {useAppContext} from "../../../app/provider/AppContextProvider";

const API_URL = process.env.API_URL_DEV

export function ProductItem({ item, isAdded=false, relationId=0, isSelectBtn=false,clickable=true, onClick=f=>f, isPrice=false }) {

    const {id, image, name, description } = item

    const { authHandler } = useAppContext()
    const { user } = authHandler

    console.log('RELATIONS PRODUCT ITEM relationId', relationId)


    // const navigate = useNavigate()

    const [productModal, toggleProductModal] = useToggle()
    const [productDeleteModal, toggleProductDeleteModal] = useToggle()

    const [productEditPriceModal, toggleProductEditPriceModal] = useToggle()
    const [relationProductDeleteModal, toggleRelationProductDeleteModal] = useToggle()

    function handleClick(flag) {
        if (flag) {
            toggleRelationProductDeleteModal()
        } else {
            toggleProductDeleteModal()
        }
    }


    return (<div className={`
        ${styles.ShopItem}
        ${isSelectBtn && styles['ShopItem--no-padding']}
    `}>

        {productModal && <ProductUpdate data={item} onClose={toggleProductModal}/>}
        {productDeleteModal && <ProductDelete productId={item.id} onClose={toggleProductDeleteModal}/>}
        {productEditPriceModal && <EditProductPrice selectedProduct={item} relationId={relationId} onClose={toggleProductEditPriceModal}/>}
        {relationProductDeleteModal && <DeleteRelationProduct productId={item.id} relationId={relationId} onClose={toggleRelationProductDeleteModal}/>}

        <div className={styles.ShopItem__img}>
            <img src={API_URL + image} alt=""/>
            {/*<img src={'https://as.fishki.net/upload/post/2020/11/01/99243613/gallery/99243613.jpg'} alt=""/>*/}
            {/*<img src={''} alt=""/>*/}
        </div>
        {/*{user.role === 'super_admin' &&*/}
        {/*    <div className={styles.ShopItem__like}>*/}
        {/*        <button className={`*/}
        {/*        ${styles.ShopItem__like_btn}*/}
        {/*    `} onClick={e => handleClick(relationId !== 0)}><DeleteIcon/></button>*/}
        {/*    </div>*/}
        {/*}*/}
        {/*{ oldPrice && price &&*/}
        {/*    <div className={styles.ShopItem__sale}>*/}
        {/*        {Math.round(((oldPrice.split(' ').slice(0, 2) - price.split(' ').slice(0, 2)) / oldPrice.split(' ').slice(0, 2)) * 100)}*/}
        {/*    </div>*/}
        {/*}*/}
        <Block padding={'5px 10px'}>
            {isPrice &&
                <div className={styles.ShopItem__price_block}>
                    <Typography size={18} weight={600} text={`${item?.price} тг`} marginBottom={6}/>
                    <Typography marginLeft={10} size={18} color={'green'} weight={600} text={`${ (((Number(item.price) - item.priceTotal) / Number(item.price)) * 100).toFixed(2)  }%`} marginBottom={6}/>
                    {/*<span className={styles.ShopItem__oldPrice}>{oldPrice}</span>*/}
                </div>
            }


            <Typography size={18} weight={500} text={name} marginBottom={5}/>

            <Typography size={17} color={'grey'} weight={500} text={`На складе: ${item?.quantity} шт`} marginBottom={6}/>
            <Typography size={17} color={'grey'} weight={500} text={`Общий вес: ${item?.weightTotal} кг`} marginBottom={6}/>

            { user.role === 'super_admin' && <Typography size={17} color={'grey'} weight={500} text={`Себестоимость: ${item?.priceTotal} тг`} marginBottom={6}/> }


            {/*<Typography size={14} weight={500} color={'grey'} text={description} />*/}




            <Block isInline isAlignCenter>
                {isSelectBtn && <Button marginRight={10} size={'small-text'} variant={'outline'} onClick={e => onClick(item)} marginTop={4} disabled={isAdded}>{isAdded ? 'Добавлено' : 'Выбрать'}</Button>}

                {(user.role === 'super_admin' && !isSelectBtn) && <>
                    {isPrice && <Button marginRight={10} width={'fit-content'} size={'small-text'} variant={'outline'} onClick={toggleProductEditPriceModal}>Изменить цену</Button>}

                    {clickable && <Button marginRight={10} width={'fit-content'} size={'small-text'} variant={'outline'} onClick={toggleProductModal}>Изменить</Button>}

                    <button
                        className={`
                            ${styles.ShopItem__delete_btn}
                        `}
                        onClick={e => handleClick(relationId)}
                    >
                        <DeleteIcon/>
                    </button>

                </>}

            </Block>


            {/*<div className={styles.ShopItem__block}>*/}
            {/*    {rating && <Typography marginRight={10} size={14} weight={500} color={'grey'} text={'⭐' + rating} />}*/}
            {/*    {reviewsCount && <Typography size={14} weight={500} color={'grey'} text={reviewsCount} />}*/}
            {/*</div>*/}
        </Block>

    </div>)
}