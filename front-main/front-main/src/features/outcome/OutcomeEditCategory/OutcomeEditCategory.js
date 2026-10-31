import React, {useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function OutcomeEditCategory({ data, onClose=f=>f}) {

    const { outcomeHandler } = useAppContext()
    const { updateCategory, getCategories } = outcomeHandler

    const [name, setName] = useState(data.name)

    async function onUpdate() {
        if (name == '') {
            console.log('SOME VALIDATION ERROR in CREATE CATEGORY')
            return
        }
        const response = await updateCategory({categoryId: data.id, name})
        console.log('EMPLOYEE UPDATE', response)
        await getCategories()
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение названия категории'} />

                <GroupInput>
                    <label>Название</label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите название категории'}
                        required
                    />
                </GroupInput>
            </Block>

            <GroupButtons top={20}>
                <Button onClick={updateHandle}>Сохранить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}