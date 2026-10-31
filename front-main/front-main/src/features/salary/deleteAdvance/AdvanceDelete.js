import React from "react";
import {Block, Button, GroupButtons, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function AdvanceDelete({ advanceId=0, userId=0, onClose= f=>f, getSalary=f=>f, salaryId=0}) {

    const { salaryHandler } = useAppContext()
    const { deleteAdvance, getAdvances } = salaryHandler

    async function onDelete() {
        const response = await deleteAdvance({advanceId})
        console.log('ADVANCE DELETE', response)
        await getAdvances({ salaryId })
        await getSalary()
    }


    async function deleteHandle() {
        await onDelete()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={10} align={'center'} text={'Удалить выданный аванс'} />
                <Typography weight={500} size={16} bottom={10} align={'center'} text={'Вы точно хотите удалить?'} />
            </Block>


            <GroupButtons top={20}>
                <Button onClick={deleteHandle}>Удалить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}