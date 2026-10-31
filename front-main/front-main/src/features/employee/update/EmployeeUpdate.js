import React, {useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

export function EmployeeUpdate({ data, employeeId=0, onClose=f=>f}) {

    const { adminHandler } = useAppContext()
    const { updateUser, getUsers } = adminHandler

    const [name, setName] = useState(data.name)

    async function onUpdate() {
        if (name == '') {
            console.log('SOME VALIDATION ERROR in CREATE EMPLOYEE')
            return
        }
        const response = await updateUser({employeeId, name})
        console.log('EMPLOYEE UPDATE', response)
        await getUsers()
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение данных сотрудника'} />

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
                <Block marginTop={10}></Block>
                <GroupInput>
                    <label>Почта</label>
                    <Input
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={data.email}
                        required
                        disabled
                    />
                </GroupInput>
                <Block marginTop={10}></Block>
                <GroupInput>
                    <label>Роль</label>
                    <Input
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={data.role === 'super_admin' ? 'СУПЕР АДМИН' : 'Сотрудник'}
                        required
                        disabled
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