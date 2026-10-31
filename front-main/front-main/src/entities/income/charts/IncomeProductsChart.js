// SalesChart.js
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {Block, Typography} from "../../../shared/ui";
import styles from './chart.module.css'

// Регистрация необходимых компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export function IncomeProductsChart ({ data }) {
    const [chartDataProducts, setChartDataProducts] = useState({ labels: [], datasets: [] });
    const [chartDataClients, setChartDataClients] = useState({ labels: [], datasets: [] });


    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState([])
    const [clients, setClients] = useState([])
    const [productsNames, setProductsNames] = useState([])
    const [clientsNames, setClientsNames] = useState([])
    const [backgroundColors, setBackgroundColors] = useState([])

    function groupAndSortByClientAndProduct(incomes) {
        const clients = {};
        const products = {};

        incomes.forEach(income => {
            const { business_relation, product, totalAmount } = income;

            // Группируем и суммируем по клиентам
            if (!clients[business_relation.id]) {
                clients[business_relation.id] = { records: [], totalAmount: 0 };
            }
            clients[business_relation.id].records.push(income);
            clients[business_relation.id].totalAmount += Number(totalAmount);

            if (product) {
                // Группируем и суммируем по продуктам
                if (!products[product.id]) {
                    products[product.id] = { records: [], totalAmount: 0 };
                }
                products[product.id].records.push(income);
                products[product.id].totalAmount += Number(totalAmount);
            }
        });

        // Сортировка записей по убыванию totalAmount для клиентов
        Object.keys(clients).forEach(clientId => {
            clients[clientId].records.sort((a, b) => b.totalAmount - a.totalAmount);
        });

        // Сортировка записей по убыванию totalAmount для продуктов
        Object.keys(products).forEach(productId => {
            products[productId].records.sort((a, b) => b.totalAmount - a.totalAmount);
        });

        return { clients, products };
    }

    function transformToArrays(groupedData) {
        const clientNames = [];
        const clientTotals = [];

        // Преобразуем клиентов в массивы
        Object.keys(groupedData.clients).forEach(clientId => {
            const clientData = groupedData.clients[clientId];
            clientNames.push(clientData.records[0].business_relation.name); // Используем поле `name` клиента
            clientTotals.push(clientData.totalAmount);
        });

        const productNames = [];
        const productTotals = [];

        // Преобразуем продукты в массивы
        Object.keys(groupedData.products).forEach(productId => {
            const productData = groupedData.products[productId];
            productNames.push(productData.records[0].product.name); // Используем поле `name` продукта
            productTotals.push(productData.totalAmount);
        });

        return { clientNames, clientTotals, productNames, productTotals };
    }

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



    useEffect(() => {
        // if (data.length > 0) {


        const result = groupAndSortByClientAndProduct(data)
        const result2 = transformToArrays(result)
            // const labels = result.clients?.map((sale) => sale.date);
            // const clientsFromArr = result.clients.map((c) => c.totalAmount);
            // const productsFromArr = result.products.map((p) => p.totalAmount);

        setClients(result2.clientTotals)
        setProducts(result2.productTotals)
        setProductsNames(result2.productNames)
        setClientsNames(result2.clientNames)



        console.log('INCOME CHART: data', data)
        console.log('INCOME CHART: data transform', result2)
        // Определение цвета для каждого продукта на основе его индекса
        const backgroundColors = data.map((obj, index) => presetColors[obj.id % presetColors.length]);
        setBackgroundColors(backgroundColors)
        // }

    }, [data]);

    useEffect(() => {
        // if (clients.length > 0 && products.length > 0) {
            //
        setChartDataProducts({
            labels: productsNames,
            datasets: [
                {
                    label: 'Общая сумма',
                    data: products,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });

        setChartDataClients({
            labels: clientsNames,
            datasets: [
                {
                    label: 'Общая сумма',
                    data: clients,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });
        // }
    }, [clients, products]);


    if (data.length < 1) {
        return <>
            <Block marginTop={0} marginBottom={0}>
                <Typography size={16} weight={400} text={`Нет товаров в базе.`}/>
            </Block>
        </>
    }

    return (
        <div className={styles.row}>
            {/*<h2>График продаж</h2>*/}
            <Block padding={'0 20px'}>
                <Typography size={18} weight={600} text={'По товарам: '}/>
                { products.length < 1 ?
                    <Block marginTop={0} marginBottom={0}>
                        <Typography size={16} weight={400} text={`Нет товаров в базе.`}/>
                    </Block>
                    : <>
                        <Pie data={chartDataProducts} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                    </>
                }
            </Block>



            <Block marginBottom={15}></Block>

            <Block padding={'0 20px'}>
                <Typography size={18} weight={600} text={'По клиентам: '}/>
                { clients.length < 1 ?
                    <Block marginTop={0} marginBottom={0}>
                        <Typography size={16} weight={400} text={`Нет клиентов в базе.`}/>
                    </Block>
                    : <>
                        <Pie data={chartDataClients} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                    </>
                }
            </Block>

        </div>
    );
};

