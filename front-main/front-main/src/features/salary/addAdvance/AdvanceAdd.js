import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

import AddIcon from '../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg'
import DeleteIcon from '../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
const API_URL = process.env.API_URL_DEV

export function AdvanceAdd({ salaryId=0, onClose=f=>f, getSalary=f=>f }) {

    const { salaryHandler } = useAppContext()
    const { createAdvance, getAdvances } = salaryHandler

    const [amount, setAmount] = useState('')
    const [paymentType, setPaymentType] = useState('')


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
        const response = await createAdvance({salaryId, amount: Number(amount), payment_type: paymentType})
        console.log('SALARY ADVANCE CREATE', response)
        await getAdvances({salaryId})
        await getSalary()
    }

    async function createHandle() {
        await onCreate()
        onClose()
    }

    return(
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <GroupInput>
                    <label>Аванс: </label>
                    <Input
                        name={'amount'}
                        type={'number'}
                        onChange={e => setAmount(e.target.value)}
                        value={amount}
                        placeholder={'Введите аванс'}
                        required
                    />
                </GroupInput>

                <Block marginTop={10}></Block>

                <GroupInput>
                    <label>Тип платежа: </label>
                    <Input
                        name={'paymentType'}
                        type={'text'}
                        onChange={e => setPaymentType(e.target.value)}
                        value={paymentType}
                        placeholder={'Введите типа платежа'}
                        required
                    />
                </GroupInput>
                <Button marginTop={8} onClick={createHandle}>Выдать аванс</Button>
            </Block>
        </Modal>
    )
}