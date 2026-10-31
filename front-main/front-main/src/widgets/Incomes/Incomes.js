import React, {useEffect, useState} from "react";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {Block, Button, Typography} from "../../shared/ui";
import {Loading} from "../Loading";
import styles from './Incomes.module.css'
import useToggle from "../../shared/hooks/useToggle";
import AddIcon from '../../shared/assets/icons/add_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {FilterDate} from "../../features/filter/FilterDate";
import {IncomeCreate} from "../../features/income/create/IncomeCreate";
import {IncomeItem} from "../../entities/income/item/IncomeItem";
import {IncomeDownloadPdf} from "../../features/income/pdf/IncomeDownloadPdf";
import {FilterClients} from "../../features/filter/FilterClients";
import {FilterProducts} from "../../features/filter/FilterProducts";
import {IncomeProductsChart} from "../../entities/income/charts/IncomeProductsChart";
import {IncomeClientDownloadPdf} from "../../features/income/pdf/IncomeClientDownloadPdf";

export function Incomes({}) {

    const { incomeHandler } = useAppContext()
    const { incomes, getIncomes, isLoading } = incomeHandler

    const [createIncomeModal, toggleCreateIncomeModal] = useToggle()

    const [groupedIncomes, setGroupedIncomes] = useState({});
    const [globalTotal, setGlobalTotal] = useState(0);

    const [filter, setFilter] = useState({
        order: 'ASC',
        date: '',
        dateFrom: '',
        dateTo: '',
        clients: [],
        products: [],
    });

    const fetchRecords = async () =>  {
        await (async () => {

            await getIncomes(filter)
        })()
    }


    useEffect(() => {
        fetchRecords()

    }, []);

    useEffect(() => {
        fetchRecords()

        console.log('INCOMES: filter', filter)
    }, [filter]);


    useEffect(() => {
        console.log("CHECKKKK FILTER", filter)
        console.log("CHECKKKK INCOMES", incomes)


        const grouped = incomes.reduce((acc, income) => {
            const date = new Date(income?.date).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { incomes: [], total: 0 };
            }
            acc[date].incomes.push(income);
            acc[date].total += Number(income?.totalAmount);

            // setGlobalTotal(globalTotal + acc[date].total);

            return acc;
        }, {});

        setGroupedIncomes(grouped);

        // Рассчитываем глобальную сумму отдельно.
        const total = incomes.reduce((sum, income) => sum + Number(income.totalAmount), 0);
        setGlobalTotal(total);

    }, [incomes]);


    if (isLoading) {
        return <Loading />
    }


    return (<div className={styles.Outcomes}>
        {createIncomeModal && <IncomeCreate onClose={toggleCreateIncomeModal} />}
        {/*{isFilter && <OutcomeFilter filter={filter} onFilterChange={setFilter} onClose={toggleIsFilter} />}*/}


        <div className={styles.filters}>
            <IncomeDownloadPdf filter={filter}/>
            {/*<Button variant={'outline'} width={'fit-content'} onClick={toggleIsFilter}>Фильтр</Button>*/}
            <FilterDate filter={filter} onChange={setFilter} />
            <FilterClients filter={filter} onChange={setFilter} />
            <FilterProducts filter={filter} onChange={setFilter} />
            <IncomeClientDownloadPdf filter={filter}/>
        </div>


        {incomes.length < 1 &&
            <Block marginTop={0} marginBottom={25} padding={'0 20px'}>
                <Typography size={16} weight={400} text={`Нет данных по доходам. Добавьте.`}/>
            </Block>
        }

        {incomes.length > 0 && <IncomeProductsChart data={incomes}/>}

        {Object.entries(groupedIncomes).map(([date, { incomes, total }]) => (
            <div key={date} className={styles.Outcomes__ul}>
                <h3 className={styles.Outcomes__date}>{format(date, 'd MMMM yyyy', {locale: ru})}</h3>
                <ul>
                    {incomes.map( (e, key) => {

                        return <IncomeItem key={key} item={ e } />
                    })}
                </ul>
            </div>
        ))}



        <div className={styles.Outcomes__bottom}>
            <div className={styles.Outcomes__total}>
                Итого: {globalTotal} тг
            </div>
            <div className={styles.Outcomes__add}>
                <Button borderRadius={0} width={'fit-content'} isIconic onClick={toggleCreateIncomeModal}><AddIcon/></Button>
            </div>
        </div>

    </div>)
}