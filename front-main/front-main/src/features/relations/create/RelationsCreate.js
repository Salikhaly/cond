import React, {useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function RelationsCreate({ category, onClose=f=>f }) {

    const { relationsHandler } = useAppContext()
    const { createRelation, getRelations } = relationsHandler

    const [name, setName] = useState('')
    // const [email, setEmail] = useState('')

    async function onCreate() {
        if (name == '' ) {
            console.log('SOME VALIDATION ERROR in CREATE RELATION')
            return
        }

        const response = await createRelation({name, category})
        console.log('RELATION CREATE', response)
        await getRelations()
    }


    async function createHandle() {
        await onCreate()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={`Добавление ${category === 'clients' ? 'клиента' : 'поставщика'}`} />

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
                {/*<GroupInput>*/}
                {/*    <label>Email</label>*/}
                {/*    <Input*/}
                {/*        name={'email'}*/}
                {/*        type={'email'}*/}
                {/*        onChange={e => setEmail(e.target.value)}*/}
                {/*        value={email}*/}
                {/*        placeholder={'Введите почту сотрудника'}*/}
                {/*        required*/}
                {/*    />*/}
                {/*</GroupInput>*/}
            </Block>

            <GroupButtons top={20}>
                <Button onClick={createHandle}>Добавить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}