import React from "react";
import {Block, Button, GroupButtons, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function IncomeDelete({ incomeId=0, onClose=f=>f}) {

    const { incomeHandler } = useAppContext()
    const { deleteIncome, getIncomes } = incomeHandler

    async function onDelete() {
        const response = await deleteIncome({incomeId})
        console.log('EMPLOYEE DELETE', response)
        await getIncomes()
    }


    async function deleteHandle() {
        await onDelete()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Вы точно хотите удалить элемент дохода?'} />
                {/*<Typography weight={500} size={16} color={'#65727D'} align={'center'}>Мы можем помочь вам найти вам идеальный вариант согласно вашим запросам</Typography>*/}
            </Block>

            <GroupButtons top={20}>
                <Button onClick={deleteHandle}>Удалить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}