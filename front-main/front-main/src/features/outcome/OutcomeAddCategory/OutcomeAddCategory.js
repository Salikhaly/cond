import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {useAppContext} from "../../../app/provider/AppContextProvider";

import AddIcon from '../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg'
import DeleteIcon from '../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
const API_URL = process.env.API_URL_DEV

export function OutcomeAddCategory({  }) {

    const { outcomeHandler } = useAppContext()
    const { createCategory, getCategories } = outcomeHandler

    const [name, setName] = useState('')


    async function onCreate() {
        // e.preventDefault();
        if (name == '' ) {
            console.log('SOME VALIDATION ERROR in CREATE CATEGORY')
            return
        }
        const response = await createCategory({name})
        console.log('CATEGORY CREATE', response)
        await getCategories()
    }

    async function createHandle() {
        await onCreate()
    }

    return(<Block>
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
        <Button marginTop={8} onClick={createHandle}>Добавить категорию</Button>
    </Block>)
}