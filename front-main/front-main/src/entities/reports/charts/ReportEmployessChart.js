// SalesChart.js
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {Block, Typography} from "../../../shared/ui";
import styles from './chart.module.css'

// Регистрация необходимых компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export function ReportEmployeesChart ({ data }) {
    const [chartDataProducts, setChartDataProducts] = useState({ labels: [], datasets: [] });

    const [isLoading, setIsLoading] = useState(false)
    const [reports, setReports] = useState([])
    const [reportUserNames, setReportUserNames] = useState([])

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
    const backgroundColors = reports.map((_, index) => presetColors[index % presetColors.length]);


    function groupAndSortByClientAndProduct(records) {
        const reports = [];

        records.forEach(record => {
            const { id, user, total } = record;

            const founded = reports.find( r => r?.user?.id === user?.id)

            if (founded) {
                founded.total += Number(total)
            } else {
                reports[id] = { user, total: Number(total) };
            }

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

        return { reports };
    }

    function transformToArrays(groupedData) {

        const reportUserNames = [];
        const reportTotals = [];

        // Преобразуем продукты в массивы
        Object.keys(groupedData.reports).forEach(productId => {
            const reportData = groupedData.reports[productId];
            reportUserNames.push(reportData?.user?.name); // Используем поле `name` продукта
            reportTotals.push(reportData.total);
        });

        return { reportUserNames, reportTotals };
    }

    useEffect(() => {
        // if (data.length > 0) {


        const result = groupAndSortByClientAndProduct(data)
        const result2 = transformToArrays(result)
        // const labels = result.clients?.map((sale) => sale.date);
        // const clientsFromArr = result.clients.map((c) => c.totalAmount);
        // const productsFromArr = result.products.map((p) => p.totalAmount);

        setReports(result2.reportTotals)
        setReportUserNames(result2.reportUserNames)



        console.log('REPORT EMPLOYEES CHART: data transform', result2)
        // }

    }, [data]);

    useEffect(() => {
        // if (clients.length > 0 && products.length > 0) {
        //
        setChartDataProducts({
            labels: reportUserNames,
            datasets: [
                {
                    label: 'Всего изготовлено (кг): ',
                    data: reports,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });

        // }
    }, [reports]);

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
                <Typography size={16} weight={400} text={`Нет отчетов в базе.`}/>
            </Block>
        </>
    }

    function isAnyNotEmptyReports() {
        const res = reports.find(r => r > 0)
        console.log('IS ANY NOT EMPTY REPORTS: ', res, reports)
        return res
    }

    return (<>
        <div className={styles.row}>
            {/*<Typography size={18} weight={600} text={'Товары на складе: '}/>*/}
            { !isAnyNotEmptyReports() ?
                <Block marginTop={0} marginBottom={0}>
                    <Typography size={16} weight={400} text={`Пустые отчеты в базе.`}/>
                </Block>
                : <>
                    <Pie data={chartDataProducts} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                </>
            }
        </div>

    </>);
};

