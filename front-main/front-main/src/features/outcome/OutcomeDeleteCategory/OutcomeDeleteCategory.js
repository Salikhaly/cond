import React from "react";
import {Block, Button, GroupButtons, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function OutcomeDeleteCategory({ categoryId=0, onClose=f=>f}) {

    const { outcomeHandler } = useAppContext()
    const { deleteCategory, getCategories } = outcomeHandler

    async function onDelete() {
        const response = await deleteCategory({categoryId})
        console.log('CATEGORY DELETE', response)
        await getCategories()
    }


    async function deleteHandle() {
        await onDelete()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={8} align={'center'} text={'Вы точно хотите удалить категорию?'} />
                <Typography weight={500} size={16} bottom={10} color={'red'} align={'center'} text={'Вы потеряете все данные по расходам, связанные с этой категорией'} />
            </Block>

            <GroupButtons top={20}>
                <Button onClick={deleteHandle}>Удалить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}