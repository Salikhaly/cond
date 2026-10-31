import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

import AddIcon from '../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg'
import DeleteIcon from '../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
const API_URL = process.env.API_URL_DEV

export function SalaryAdd({ userId=0, salaryId=0, onClose=f=>f }) {

    const { salaryHandler } = useAppContext()
    const { updateSalary, getSalary } = salaryHandler

    const [amount, setAmount] = useState('')


    async function onCreate() {
        // e.preventDefault();
        if (amount == '' ) {
            console.log('SOME VALIDATION ERROR in CREATE SALARY')
            return
        }
        if (Number(amount) < 0) {
            console.log('SOME VALIDATION ERROR in CREATE SALARY: salary amount must be > 0')
            return
        }
        const response = await updateSalary({salaryId, amount: Number(amount)})
        console.log('SALARY CREATE', response)
        await getSalary({salaryId})
    }

    async function createHandle() {
        await onCreate()
        onClose()
    }

    return(
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Добавить зарплату'} />
            </Block>
            <Block isAlignCenter={true}>
                <GroupInput>
                    <label>Зарплата: </label>
                    <Input
                        name={'amount'}
                        type={'number'}
                        onChange={e => setAmount(e.target.value)}
                        value={amount}
                        placeholder={'Введите Зарплату'}
                        required
                    />
                </GroupInput>
                <Button marginTop={8} onClick={createHandle}>Сохранить</Button>
            </Block>
        </Modal>
    )
}