import React, {useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function EmployeeCreate({ onClose=f=>f }) {

    const { adminHandler } = useAppContext()
    const { createUser, getUsers } = adminHandler

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    async function onCreate() {
        if (name == '' || email == '') {
            console.log('SOME VALIDATION ERROR in CREATE EMPLOYEE')
            return
        }

        const response = await createUser({name, email})
        console.log('EMPLOYEE CREATE', response)
        await getUsers()
    }


    async function createHandle() {
        await onCreate()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Добавление сотрудника'} />

                <GroupInput>
                    <label>ФИО</label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите ФИО сотрудника'}
                        required
                    />
                </GroupInput>
                <GroupInput>
                    <label>Email</label>
                    <Input
                        name={'email'}
                        type={'email'}
                        onChange={e => setEmail(e.target.value)}
                        value={email}
                        placeholder={'Введите почту сотрудника'}
                        required
                    />
                </GroupInput>
            </Block>

            <GroupButtons top={20}>
                <Button onClick={createHandle}>Добавить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}