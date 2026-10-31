import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

import AddIcon from '../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg'
import DeleteIcon from '../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
const API_URL = process.env.API_URL_DEV

export function AdvanceEdit({ getSalary=f=>f,salaryId=0, advanceId=0, oldAmount=0, data={}, onClose=f=>f }) {

    const { salaryHandler } = useAppContext()
    const { updateAdvance, getAdvances } = salaryHandler

    const [amount, setAmount] = useState(oldAmount)
    const [paymentType, setPaymentType] = useState(data?.payment_type || '')


    async function onCreate() {
        // e.preventDefault();
        if (amount == '' ) {
            console.log('SOME VALIDATION ERROR in EDIT ADVANCE')
            return
        }
        if (Number(amount) < 0) {
            console.log('SOME VALIDATION ERROR in EDIT ADVANCE: advance amount must be > 0')
            return
        }
        const response = await updateAdvance({advanceId, amount: Number(amount), payment_type: paymentType})
        console.log('ADVANCE UPDATE', response)
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
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменить выданный аванс'} />
            </Block>
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
                <Button marginTop={8} onClick={createHandle}>Сохранить</Button>
            </Block>
        </Modal>
    )
}