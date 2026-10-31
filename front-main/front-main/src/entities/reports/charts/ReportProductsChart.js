// SalesChart.js
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {Block, Typography} from "../../../shared/ui";
import styles from './chart.module.css'

// Регистрация необходимых компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export function ReportProductsChart ({ data }) {
    const [chartDataProducts, setChartDataProducts] = useState({ labels: [], datasets: [] });

    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState([])
    const [productsNames, setProductsNames] = useState([])

    const presetColors = [
        'rgba(255, 99, 132, 0.6)', // Красный
        'rgba(54, 162, 235, 0.6)', // Синий
        'rgba(255, 206, 86, 0.6)', // Желтый
        'rgba(75, 192, 192, 0.6)', // Бирюзовый
        'rgba(153, 102, 255, 0.6)', // Фиолетовый
        'rgba(255, 159, 64, 0.6)', // Оранжевый
        // Можно добавить больше цветов при необходимости
    ];

    const borderColors = presetColors.map(color => color.replace('0.6', '1'));

    // Определение цвета для каждого продукта на основе его индекса
    const backgroundColors = products.map((_, index) => presetColors[index % presetColors.length]);


    function groupAndSortByClientAndProduct(records) {
        const products = {};

        records.forEach(record => {
            const { id, name, quantity } = record;

            products[id] = { name, quantity: Number(quantity) };

            // if (product) {
            //     // Группируем и суммируем по продуктам
            //     if (!products[product.id]) {
            //         products[product.id] = { records: [], totalAmount: 0 };
            //     }
            //     products[product.id].records.push(record);
            //     products[product.id].totalAmount += Number(totalAmount);
            // }
        });

        // // Сортировка записей по убыванию totalAmount для продуктов
        // Object.keys(products).forEach(productId => {
        //     products.sort((a, b) => b.totalAmount - a.totalAmount);
        // });

        return { products };
    }

    function transformToArrays(groupedData) {

        const productNames = [];
        const productTotals = [];

        // Преобразуем продукты в массивы
        Object.keys(groupedData.products).forEach(productId => {
            const productData = groupedData.products[productId];
            productNames.push(productData.name); // Используем поле `name` продукта
            if (!productData.quantity < 1) {
                productTotals.push(productData.quantity);
            }
        });

        return { productNames, productTotals };
    }

    useEffect(() => {
        // if (data.length > 0) {


        const result = groupAndSortByClientAndProduct(data)
        const result2 = transformToArrays(result)
        // const labels = result.clients?.map((sale) => sale.date);
        // const clientsFromArr = result.clients.map((c) => c.totalAmount);
        // const productsFromArr = result.products.map((p) => p.totalAmount);

        setProducts(result2.productTotals)
        setProductsNames(result2.productNames)



        console.log('REPORT CHART: data transform', result2)
        // }

    }, [data]);

    useEffect(() => {
        // if (clients.length > 0 && products.length > 0) {
        //
        setChartDataProducts({
            labels: productsNames,
            datasets: [
                {
                    label: 'Количество',
                    data: products,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });

        // }
    }, [products]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                enabled: true,
            },
        },
    };

    if (data.length < 1) {
        return <>
            <Block marginTop={0} marginBottom={0}>
                <Typography size={16} weight={400} text={`Нет товаров в базе.`}/>
            </Block>
        </>
    }

    return (<>
        <div className={styles.row}>
            {/*<Typography size={18} weight={600} text={'Товары на складе: '}/>*/}
            { data.length < 1 ?
                <Block marginTop={0} marginBottom={0}>
                    <Typography size={16} weight={400} text={`Нет товаров в базе.`}/>
                </Block>
                : <>
                    {products.length < 1 ?
                        <Block marginTop={0} marginBottom={0}>
                            <Typography size={16} weight={400} text={`Нет товаров на складе.`}/>
                        </Block>

                        : <Pie data={chartDataProducts} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                    }

                </>
            }
        </div>
        {/*<h2>График продаж</h2>*/}
        {/*<Pie data={chartDataProducts} options={options} />*/}
        {/*<Block marginBottom={15}></Block>*/}
    </>);
};

