import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../shared/ui";
import {useAppContext} from "../../app/provider/AppContextProvider";

import AddIcon from '../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg'
import DeleteIcon from '../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import {CategoryItem} from "../../entities/outcome/category/CategoryItem";
import {OutcomeAddCategory} from "../../features/outcome/OutcomeAddCategory/OutcomeAddCategory";
const API_URL = process.env.API_URL_DEV

export function OutcomeManage({ onClose= f=>f }) {

    const { outcomeHandler } = useAppContext()
    const { categories, getCategories } = outcomeHandler

    useEffect(() => {
        (async () => {
            await getCategories()
        })()
    }, []);

    return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Управление категориями'} />

                <Block marginBottom={10}>
                    <OutcomeAddCategory/>
                </Block>

                <Block marginTop={15}>
                    <GroupInput>
                        <label>Созданные категории:</label>
                        {categories.length < 1 && <Block marginTop={8}>
                            <Typography size={16} weight={400} text={`Нет категорий расходов. Создайте.`}/>
                        </Block>}

                        <Block marginTop={8}>
                            {categories.map((i, key) => {

                                return <CategoryItem key={key} data={i} />
                            })}
                        </Block>

                        {/*<Button marginTop={6} onClick={e => addIngredient(`Состав ${categories.length + 1}`)} width={'fit-content'} isIconic><AddIcon/></Button>*/}

                    </GroupInput>
                </Block>

            </Block>

            <GroupButtons top={20}>
                {/*<Button onClick={createHandle}>Добавить</Button>*/}
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Закрыть</Button>
            </GroupButtons>
        </Modal>
    </>)
}