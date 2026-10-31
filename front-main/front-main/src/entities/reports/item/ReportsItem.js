import React, {useEffect, useState} from "react";
import styles from './ReportsItem.module.css'
import {Block, Button, Grid, Typography} from "../../../shared/ui";
import useToggle from "../../../shared/hooks/useToggle";
import {ReportsAddProduct} from "../../../features/reports/ReportsAddProduct/ReportsAddProduct";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {ProductItem} from "../../products/item/ProductItem";
import {Loading} from "../../../widgets/Loading";
import {ReportProductItem} from "../reportItem/ReportProductItem";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {$api} from "../../../app/http";


const API_URL = process.env.API_URL_DEV

export function ReportsItem({ item, reportId=0, isCurrent=false, isAdmin=false }) {

    const { reportsHandler, authHandler } = useAppContext()
    // const { reportsProducts, getReportsProducts, isLoading } = reportsHandler

    const {user} = authHandler
    const [addProductModal, toggleAddProductModal] = useToggle()

    const [reportProducts, setReportProducts] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    const date = format(isCurrent ? new Date() : item.createdAt, 'd MMMM yyyy', { locale: ru })

    const getReportProducts = async () => {
        setIsLoading(true);
        try {
            const response = await $api.get(`/reports/${item.id}/products`);
            console.log('!1111111111 result.data:', response.data);

            setReportProducts(response.data.products); // Предполагается, что данные находятся в `response.data.products`
        } catch (error) {
            if (error.response) {
                // Сервер обработал запрос, но вернул ошибку (4xx, 5xx)
                console.error('Error fetching report products:', error.response.status, error.response.data);
            } else {
                // Ошибка на уровне сети или Axios
                console.error('Fetch error:', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // if (isCurrent) {
        //     console.log('DOLOGZHADNNY ITEM', item)
        // }
        // if (item) {
            getReportProducts()

        // }
    }, [item]);

    function isToday(date) {
        const today  = new Date();
        // today.setHours(0, 0, 0, 0);

        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }



    if (isLoading) {
        return <Loading />
    }


    return (<div className={styles.ReportsItem}>

        {isCurrent && addProductModal && <ReportsAddProduct addedProducts={reportProducts} getReportProducts={getReportProducts} reportId={item?.id} onClose={toggleAddProductModal} />}

        <div className="ReportsItem__date">
            <Typography size={24} text={isCurrent ? `Сегодня (${date})` : `${date}` } color={ isCurrent ? 'green' : 'black' } weight={600} marginBottom={15} />
        </div>


        { reportProducts.length < 1 &&
            <Block marginTop={10} marginBottom={25}>
                <Typography size={16} weight={400} text={isAdmin ? 'Сотрудник не заполнил отчет' :  (isToday(new Date(item.createdAt)) ? `Сегодняшний отчет не заполнен. Заполните.` : 'Отчет не был заполнен' )}/>
            </Block>
        }

        {isCurrent &&
            <div className="ReportsItem__button">
                <Button marginTop={10} onClick={toggleAddProductModal}>Добавить товар</Button>
            </div>
        }

        <Block marginTop={isCurrent ? 15 : 0}>

            {/*<Grid>*/}
                { reportProducts?.map((i, key) => {
                    return <ReportProductItem isToday={isToday(new Date(item.createdAt))} isAdmin={true} getProducts={getReportProducts} reportId={reportId} key={key} onClick={f=>f} item={i} />
                }) }
            {/*</Grid>*/}
        </Block>


    </div>)
}