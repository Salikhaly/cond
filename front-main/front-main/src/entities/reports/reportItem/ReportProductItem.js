import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Block,Typography,Button} from "../../../shared/ui";
import styles from './ReportProductItem.module.css'
import LikeIcon from '../../../shared/assets/icons/Property 1=heart.svg'
import useToggle from "../../../shared/hooks/useToggle";
import {ProductUpdate} from "../../../features/products/update/ProductUpdate";
import {ProductDelete} from "../../../features/products/delete/ProductDelete";
import DeleteIcon from '../../../shared/assets/icons/delete_24dp_FILL0_wght400_GRAD0_opsz24.svg'
import EditIcon from '../../../shared/assets/icons/edit_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg'
import {EditProductPrice} from "../../../features/relations/EditProductPrice/EditProductPrice";
import {DeleteRelationProduct} from "../../../features/relations/DeleteRelationProduct/DeleteRelationProduct";
import {ReportsEditProduct} from "../../../features/reports/ReportsEditProduct/ReportsEditProduct";
import {ReportsDeleteProduct} from "../../../features/reports/ReportsDeleteProduct/ReportsDeleteProduct";
import {useAppContext} from "../../../app/provider/AppContextProvider";
export function ReportProductItem({ item, isToday=false, reportId=0, onClick=f=>f, getProducts=f=>f, isAdmin=false }) {

    const {id, image, name, description } = item

    const {authHandler} = useAppContext()
    const {user} = authHandler

    console.log('REPORT PRODUCT ITEM reportId', reportId, item)


    const [ReportsEditProductModal, toggleReportsEditProductModal] = useToggle()
    const [ReportsDeleteProductModal, toggleReportsDeleteProductModal] = useToggle()

    function checkToday(date) {
        const today  = new Date();
        today.setHours(0, 0, 0, 0);

        date.setHours(0, 0, 0, 0);
        // today.setHours(0, 0, 0, 0);

        console.log('DAET TOOOODAY', date, today, date === today)

        return date.getTime() === today.getTime();
    }

    return (<div className={styles.ShopItem}>

        {ReportsEditProductModal && <ReportsEditProduct selectedProduct={item} getProducts={getProducts} reportId={reportId} onClose={toggleReportsEditProductModal} />}
        {ReportsDeleteProductModal && <ReportsDeleteProduct selectedProduct={item} getProducts={getProducts} reportId={reportId} onClose={toggleReportsDeleteProductModal} />}
        {/*{productModal && <ProductUpdate data={item} onClose={toggleProductModal}/>}*/}
        {/*{productDeleteModal && <ProductDelete productId={item.id} onClose={toggleProductDeleteModal}/>}*/}
        {/*{productEditPriceModal && <EditProductPrice selectedProduct={item} relationId={relationId} onClose={toggleProductEditPriceModal}/>}*/}
        {/*{relationProductDeleteModal && <DeleteRelationProduct productId={item.id} relationId={relationId} onClose={toggleRelationProductDeleteModal}/>}*/}

        {user.role !=='super_admin' && isToday && <>
            <div className={styles.ShopItem__img} onClick={f=>f}>
                {/*<img src={image} alt=""/>*/}
                    <div className={styles.ShopItem__like}>
                        <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                            toggleReportsDeleteProductModal
                        }><DeleteIcon/></button>
                    </div>
                    <div className={styles.ShopItem__edit}>
                        <button className={`
                    ${styles.ShopItem__like_btn}
                `} onClick={
                            toggleReportsEditProductModal
                        }><EditIcon/></button>
                    </div>
            </div>
        </>}




        <Block padding={10}>
            <div className={styles.ShopItem__name}>
                <Typography weight={600} size={18} text={item.product.name} />
            </div>
            {/*<Typography size={18} weight={600} text={name} marginBottom={5}/>*/}

            <div className={styles.ShopItem__price_block}>
                <Block>
                    <div>
                        <Typography size={16} weight={500} text={'Ед. измерения: '} marginBottom={3}/>
                        <Typography size={16} weight={600} text={item?.measure === 'kg' ? 'КГ' : 'ШТ'} marginBottom={3}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={'Количество: '} marginBottom={0}/>
                        <Typography size={16} weight={600} text={item?.quantity} marginBottom={0}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={'Общий вес: '} marginBottom={0}/>
                        <Typography size={16} weight={600} text={`${item?.measure === 'piece' ? (item?.quantity * item?.product?.weight).toFixed(2) : item?.quantity } кг`} marginBottom={0}/>
                    </div>
                    <div>
                        <Typography size={16} weight={500} text={`К зарплате: +`} marginBottom={0}/>
                        <Typography size={16} weight={600} text={`${item?.totalForSalary} тг`} marginBottom={0}/>
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