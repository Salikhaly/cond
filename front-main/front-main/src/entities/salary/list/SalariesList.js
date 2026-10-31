import React, {useEffect} from "react";
import {GroupInput} from "../../../shared/ui";
import styles from "../../outcome/select/select.module.css";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const monthNamesNominative = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export function SalariesList({ items=[], onSelect=f=>f, selectedItem }) {

    function onChange(value) {
        const obj = items.find(i => i?.id == value)
        onSelect(obj)
    }

    useEffect(() => {
        console.log('CHECK SLARIES LIIIIIST: items', items)
    }, []);

    return (<>
        <GroupInput>
            <label>Выберите месяц: </label>
            <select className={styles.select} name={'categoryId'} id="categoryId" onChange={e => onChange(e.target.value)}>
                <option value={0} disabled selected>Выберите месяц</option>
                {items.length > 0 && items.map((i, key) => {
                    const date = new Date(i?.date)
                    const month = monthNamesNominative[date.getMonth()];
                    const formattedDate = i?.date
                        ? format(new Date(i.date), `${month} yyyy`, {locale: ru})
                        : 'Invalid date';
                    return (
                        <option selected={i?.id == selectedItem?.id} key={key} value={i?.id}>
                            {formattedDate}
                        </option>
                    );
                })}
            </select>
        </GroupInput>
    </>)
}