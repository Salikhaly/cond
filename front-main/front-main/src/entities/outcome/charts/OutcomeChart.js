// SalesChart.js
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {Block, Typography} from "../../../shared/ui";
import styles from './chart.module.css'

// Регистрация необходимых компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export function OutcomeChart ({ data }) {
    const [chartDataCategories, setChartDataCategories] = useState({ labels: [], datasets: [] });


    const [isLoading, setIsLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [categoriesNames, setCategoriesNames] = useState([])
    const [backgroundColors, setBackgroundColors] = useState([])

    function groupAndSortByClientAndProduct(outcomes) {
        const categories = {};

        outcomes.forEach(outcome => {
            const { outcome_category, totalAmount } = outcome;

            // Группируем и суммируем по клиентам
            if (!categories[outcome_category.id]) {
                categories[outcome_category.id] = { records: [], totalAmount: 0 };
            }
            categories[outcome_category.id].records.push(outcome);
            categories[outcome_category.id].totalAmount += Number(totalAmount);

        });

        // Сортировка записей по убыванию totalAmount для клиентов
        Object.keys(categories).forEach(catId => {
            categories[catId].records.sort((a, b) => b.totalAmount - a.totalAmount);
        });


        return { categories };
    }

    function transformToArrays(groupedData) {
        const categoriesNames = [];
        const categoriesTotals = [];

        // Преобразуем клиентов в массивы
        Object.keys(groupedData.categories).forEach(catId => {
            const categoryData = groupedData.categories[catId];
            categoriesNames.push(categoryData.records[0].outcome_category.name); // Используем поле `name` клиента
            categoriesTotals.push(categoryData.totalAmount);
        });


        return { categoriesNames, categoriesTotals };
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

        setCategories(result2.categoriesTotals)
        setCategoriesNames(result2.categoriesNames)



        console.log('OUTCOME CHART: data transform', result)
        console.log('OUTCOME CHART: data transform 2', result2)

        const backgroundColors = data.map((obj, index) => presetColors[obj.id % presetColors.length]);
        setBackgroundColors(backgroundColors)
        // }

    }, [data]);

    useEffect(() => {
        // if (clients.length > 0 && products.length > 0) {
        //
        setChartDataCategories({
            labels: categoriesNames,
            datasets: [
                {
                    label: 'Общая сумма',
                    data: categories,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });

        // setChartDataClients({
        //     labels: clientsNames,
        //     datasets: [
        //         {
        //             label: 'По клиентам',
        //             data: clients,
        //             backgroundColor: 'rgba(102,209,255,0.6)',
        //             borderColor: 'rgba(102,209,255,0.6)',
        //             borderWidth: 1,
        //             barPercentage: 0.5,
        //             categoryPercentage: 0.5,
        //         }
        //     ],
        // });
        // }
    }, [categories]);

    return (
        <div className={styles.row}>
            <Block padding={'0 20px'}>
                <Typography size={18} weight={600} text={'График по категориям расходов: '}/>
                { categories.length < 1 ?
                    <Block marginTop={0} marginBottom={0}>
                        <Typography size={16} weight={400} text={`Нет данных в базе.`}/>
                    </Block>
                    : <>
                        <Pie data={chartDataCategories} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                    </>
                }
            </Block>
            {/*<Bar data={chartDataCategories} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />*/}
            {/*<Block marginBottom={15}></Block>*/}
        </div>
    );
};

