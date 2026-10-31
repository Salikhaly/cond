// ProductClientPieChart.js
import React, {useEffect, useState} from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {useAppContext} from "../../app/provider/AppContextProvider";
import {Loading} from "../Loading";
import {FilterDate} from "../../features/filter/FilterDate";
import {Block, Typography} from "../../shared/ui";
import styles from './chart.module.css'

// Регистрация необходимых компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const MainChart = ({  }) => {

    const [filter, setFilter] = useState({
        order: 'ASC',
        date: '',
        dateFrom: '',
        dateTo: '',
    });

    const { outcomeHandler, incomeHandler } = useAppContext()
    const { outcomes, getOutcomes, isLoading } = outcomeHandler
    const { incomes, getIncomes, } = incomeHandler
    const isIncomeLoading = incomeHandler.isLoading

    const [chartData, setChartData] = useState({ labels: [], datasets: [] })
    const [groupedData, setGroupedData] = useState([])
    const [totalAnalytic, setTotalAnalytic] = useState(0)



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

    useEffect(() => {
        (async() => {
            await getOutcomes(filter)
            await getIncomes(filter)
        })()
    }, [filter])

    useEffect(() => {
        let incomeTotal = 0;
        let outcomeTotal = 0;

        incomes.forEach( i => {
            incomeTotal += Number(i.totalAmount)
        })

        outcomes.forEach( i => {
            outcomeTotal += Number(i.totalAmount)
        })

        setGroupedData([incomeTotal, outcomeTotal])

        setTotalAnalytic(incomeTotal - outcomeTotal)

    }, [incomes, outcomes]);

    useEffect(() => {
        // if (clients.length > 0 && products.length > 0) {
        //
        console.log('MAIN CHART: income, outcome: ', groupedData)


        setChartData({
            labels: ['Доходы', 'Расходы'],
            datasets: [
                {
                    label: 'Общая сумма',
                    data: groupedData,
                    backgroundColor: [
                        'rgba(75,192,126,0.6)',
                        'rgba(255, 99, 132, 0.6)',
                    ],
                    borderColor: [
                        'rgba(75,192,126,1)',
                        'rgba(255, 99, 132, 1)',
                    ],
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5,
                }
            ],
        });

        // }
    }, [groupedData]);

    if (isLoading || isIncomeLoading) {
        return <Loading />
    }

    return (<>
        <Block marginTop={20}>
            <Typography size={24} weight={700} text={'Общая аналитика'}/>
        </Block>
        <Block marginTop={5}>
            <FilterDate filter={filter} onChange={setFilter} />
        </Block>

        {(incomes.length < 1 && outcomes.length < 1) ? <>
            <Block marginTop={10}>
                <Typography size={16} weight={400} text={`Нет данных в базе.`}/>
            </Block>
        </>
        : <>
            <Block marginTop={10} marginBottom={10}>
                <Typography size={21} weight={500} text={`Итого: ${totalAnalytic} тг`}/>
            </Block>

            <div className={styles.row}>
                <Pie data={chartData} options={options} />
            </div>

            <Block marginBottom={30}></Block>
        </>}


    </>);
};

export default MainChart;
