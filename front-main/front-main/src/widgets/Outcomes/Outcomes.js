import React, {useEffect, useState} from "react";
import {useAppContext} from "../../app/provider/AppContextProvider";
import {ReportsItem} from "../../entities/reports/item/ReportsItem";
import {Block, Button, Typography} from "../../shared/ui";
import {Loading} from "../Loading";
import styles from './Outcomes.module.css'
import useToggle from "../../shared/hooks/useToggle";
import AddIcon from '../../shared/assets/icons/add_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import {OutcomeCreate} from "../../features/outcome/create/OutcomeCreate";
import {OutcomeItem} from "../../entities/outcome/item/OutcomeItem";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {OutcomeFilter} from "../../features/outcome/Filter/OutcomeFilter";
import {FilterDate} from "../../features/filter/FilterDate";
import {FilterCategory} from "../../features/filter/FilterCategory";
import {OutcomeDownloadPdf} from "../../features/outcome/pdf/OutcomeDownloadPdf";
import {OutcomeChart} from "../../entities/outcome/charts/OutcomeChart";

export function Outcomes({}) {

    const { outcomeHandler } = useAppContext()
    const { outcomes, getOutcomes, isLoading } = outcomeHandler

    const [createOutcomeModal, toggleCreateOutcomeModal] = useToggle()
    const [isFilter, toggleIsFilter] = useToggle()

    const [groupedExpenses, setGroupedExpenses] = useState({});
    const [globalTotal, setGlobalTotal] = useState(0);

    const [filter, setFilter] = useState({
        order: 'ASC',
        date: '',
        dateFrom: '',
        dateTo: '',
        categories: [],
    });

    // const [dateFilter, setDateFilter] = useState({
    //     date: '',
    //     from: '',
    //     to: '',
    // })
    //
    // const [categoriesFilter, setCategoriesFilter] = useState({
    //     categories: [],
    // })

    const fetchRecords = async () =>  {
        await (async () => {

            await getOutcomes(filter)
        })()
    }


    useEffect(() => {
        fetchRecords()

    }, []);

    useEffect(() => {
        fetchRecords()

        console.log('OUTCOMES: filter', filter)
    }, [filter]);

    // function onDateFilter(newDateFilter) {
    //     // Обновляем dateFilter
    //     setDateFilter(newDateFilter);
    //
    //     // Обновляем filter, добавляя значения из dateFilter
    //     setFilter((prevFilter) => ({
    //         ...prevFilter,
    //         ...newDateFilter, // добавляем новые значения в filter
    //     }));
    // }
    //
    // function onCategoriesFilter(newCategories) {
    //     // Обновляем categoriesFilter
    //     setCategoriesFilter({ categories: newCategories });
    //
    //     // Обновляем filter, добавляя значения из categoriesFilter
    //     setFilter((prevFilter) => ({
    //         ...prevFilter,
    //         categories: newCategories, // добавляем новые значения в filter
    //     }));
    // }


    useEffect(() => {
        console.log("CHECKKKK FILTER", filter)
        console.log("CHECKKKK outcomes", outcomes)


        const grouped = outcomes.reduce((acc, expense) => {
            const date = new Date(expense.date).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { expenses: [], total: 0 };
            }
            acc[date].expenses.push(expense);
            acc[date].total += Number(expense.totalAmount);

            // setGlobalTotal(globalTotal + acc[date].total);

            return acc;
        }, {});

        setGroupedExpenses(grouped);

        // Рассчитываем глобальную сумму отдельно.
        const total = outcomes.reduce((sum, expense) => sum + Number(expense.totalAmount), 0);
        setGlobalTotal(total);

    }, [outcomes]);


    return (<div className={styles.Outcomes}>
        {isLoading && <Loading />}

        {createOutcomeModal && <OutcomeCreate onClose={toggleCreateOutcomeModal} />}
        {/*{isFilter && <OutcomeFilter filter={filter} onFilterChange={setFilter} onClose={toggleIsFilter} />}*/}


        <div className={styles.filters}>
            <OutcomeDownloadPdf filter={filter} />
            {/*<Button variant={'outline'} width={'fit-content'} onClick={toggleIsFilter}>Фильтр</Button>*/}
            <FilterDate filter={filter} onChange={setFilter} />
            <FilterCategory filter={filter} onChange={setFilter} />
        </div>


        {outcomes.length < 1 &&
            <Block marginTop={0} marginBottom={25} padding={'0 20px'}>
                <Typography size={16} weight={400} text={`Нет данных по расходам. Добавьте.`}/>
            </Block>
        }

        {outcomes.length > 0 && <OutcomeChart data={outcomes} /> }

        {Object.entries(groupedExpenses).map(([date, { expenses, total }]) => (
            <div key={date} className={styles.Outcomes__ul}>
                <h3 className={styles.Outcomes__date}>{format(date, 'd MMMM yyyy', {locale: ru})}</h3>
                <ul>
                    {expenses.map( (e, key) => {

                        return <OutcomeItem key={key} item={ e } />
                    })}
                </ul>
            </div>
        ))}



        <div className={styles.Outcomes__bottom}>
            <div className={styles.Outcomes__total}>
                Итого: {globalTotal} тг
            </div>
            <div className={styles.Outcomes__add}>
                <Button borderRadius={0} width={'fit-content'} isIconic onClick={toggleCreateOutcomeModal}><AddIcon/></Button>
            </div>
        </div>

    </div>)
}