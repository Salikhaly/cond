import React, {useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function RelationUpdate({ data, relationId=0, onClose=f=>f}) {

    const { relationsHandler } = useAppContext()
    const { updateRelation, getRelations } = relationsHandler

    const [name, setName] = useState(data.name)

    async function onUpdate() {
        if (name == '') {
            console.log('SOME VALIDATION ERROR in CREATE RELATION')
            return
        }
        const response = await updateRelation({relationId, name})
        console.log('RELATION UPDATE', response)
        await getRelations()
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение данных'} />

                <GroupInput>
                    <label>Имя</label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите имя'}
                        required
                    />
                </GroupInput>
                {/*<Block marginTop={8}></Block>*/}
                {/*<GroupInput>*/}
                {/*    <label>Email</label>*/}
                {/*    <Input*/}
                {/*        type={'text'}*/}
                {/*        onChange={e => setName(e.target.value)}*/}
                {/*        value={data.email}*/}
                {/*        required*/}
                {/*        disabled*/}
                {/*    />*/}
                {/*</GroupInput>*/}

            </Block>

            <GroupButtons top={20}>
                <Button onClick={updateHandle}>Сохранить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}