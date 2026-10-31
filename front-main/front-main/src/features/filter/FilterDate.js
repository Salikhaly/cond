import React, {useEffect, useState} from "react";
import {Block, Button, Drawer, Typography} from "../../shared/ui";
import styles from './filter.module.css'
import ArrowDownIcon from '../../shared/assets/icons/keyboard_arrow_down_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import CloseIcon from "../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";
export function FilterDate({ filter, onChange=f=>f }) {

    const [isDrawerActive, setIsDrawerActive] = useState(false)


    const [selectedOption, setSelectedOption] = useState('day');
    const [date, setDate] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [buttonTitle, setButtonTitle] = useState('Дата')
    const [isApplied, setIsApplied] = useState(false)


    function close() {
        setIsDrawerActive(false)
    }

    function onReset() {
        // setSelectedOption('day')
        setDate('')
        setDateFrom('')
        setDateTo('')
        setButtonTitle('')

        const obj = {
            date: '',
            dateFrom: '',
            dateTo: '',
        }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(false)
        close()
    }

    function onApply() {
        if (selectedOption === 'day' && date == '' ) {
            console.log('FILTER VALIDATION ERROR: date must contain value')
            return
        }
        if (selectedOption === 'period' && (dateFrom == '' || dateTo == '') ) {
            console.log('FILTER VALIDATION ERROR: dateFrom and dateTo must contain value')
            return
        }

        let obj = {}
        if (selectedOption === 'period') {
            obj = {
                date: '',
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo),
            }
        } else {
            obj = {
                date: new Date(date),
                dateFrom,
                dateTo: '',
            }
        }

        onChange( (prev) => ({
            ...prev,
            ...obj
        }))

        setIsApplied(true)
        close()
    }

    function setType(type) {
        if (type === 'day') {
            setDateFrom('')
            setDateTo('')
        } else {
            // setDate('')
        }
        setSelectedOption(type)
    }

    useEffect(() => {
        setDate(filter.date && new Date(filter.date).toISOString().split('T')[0])
        setDateFrom(filter.dateFrom && new Date(filter.dateFrom).toISOString().split('T')[0])
        setDateTo(filter.dateTo && new Date(filter.dateTo).toISOString().split('T')[0])

    }, [filter]);


    useEffect(() => {
       if (date !== '') {
           setButtonTitle(date)
       }
       if (dateTo !== '' && dateFrom !== '') {
           setButtonTitle(`${dateFrom} - ${dateTo}`)
       }

       console.log('FILTER CHECK: ', date, dateTo, dateFrom)
    }, [date, dateTo, dateFrom]);


    // useEffect(() => {
    //     setButtonTitle('Дата')
    // }, [isDrawerActive]);

    return (<>
        <Button borderRadius={16} variant={'outline'} width={'fit-content'} onClick={e => setIsDrawerActive(true)}>
            {isApplied || buttonTitle !=='' ? buttonTitle : 'Дата'}

            {/*<ArrowDownIcon/>*/}
        </Button>

        <Drawer
            onClose={e => close()}
            isDrawerActive={isDrawerActive}
        >
            <Block width={'99%'} isInline justifyContent={'space-between'}>
                <Typography weight={600} size={21} bottom={18} align={'center'} text={'Фильтр даты'} />

                <Button onClick={close} size={'small'} variant={'clear'} isIconic>
                    <CloseIcon/>
                </Button>
            </Block>


            <Block isInline justifyContent={'start'} padding={5}>
                <Block width={'fit-content'} marginRight={25} isInline={true} isAlignCenter={true}>
                    <input
                        type="radio"
                        id="day"
                        name="options"
                        value="day"
                        checked={selectedOption === 'day'}
                        onChange={e => setType(e.target.value) }
                    />
                    <label className={styles.label} htmlFor="day">За день</label>
                </Block>

                <Block width={'fit-content'} isInline={true} isAlignCenter={true}>
                    <input
                        type="radio"
                        id="period"
                        name="options"
                        value="period"
                        checked={selectedOption === 'period'}
                        onChange={e => setType(e.target.value)}
                    />
                    <label className={styles.label} htmlFor="period">За период</label>
                </Block>
            </Block>

            <Block marginTop={10} padding={5}>
                {selectedOption === 'day' && <>
                    <label>Дата (автоматически сегодня): </label>
                    <input
                        className={styles.input}
                        type="date"
                        id="date"
                        name="date"
                        value={date}
                        placeholder={'Введите Дату'}
                        onChange={e => setDate(e.target.value)}
                        required
                    />
                </>}

                {selectedOption === 'period' && <Block isInline>
                    <Block marginRight={10}>
                        <label>С: </label>
                        <input
                            className={styles.input}
                            type="date"
                            id="date-from"
                            name="date-from"
                            value={dateFrom}
                            placeholder={'Введите Дату'}
                            onChange={e => setDateFrom(e.target.value)}
                            required
                            max={dateTo}
                        />
                    </Block>
                    <Block>
                        <label>По: </label>
                        <input
                            className={styles.input}
                            type="date"
                            id="date-to"
                            name="date-to"
                            value={dateTo}
                            placeholder={'Введите Дату'}
                            onChange={e => setDateTo(e.target.value)}
                            required
                            min={dateFrom}
                        />
                    </Block>
                </Block>}

            </Block>

            <Block marginTop={20} isInline>
                <Button variant={'outline'} onClick={onReset}>Сбросить</Button>
                <Block width={'fit-content'} marginRight={10}></Block>
                <Button onClick={onApply}>Применить</Button>
            </Block>
        </Drawer>
    </>)
}