import React, {useEffect, useState} from "react";
import {Block, Box, Button, Grid, GroupInput, Typography} from "../shared/ui";
import {Loading} from "../widgets/Loading";
import {OutcomeAddCategory} from "../features/outcome/OutcomeAddCategory/OutcomeAddCategory";
import {CategoryItem} from "../entities/outcome/category/CategoryItem";
import {useAppContext} from "../app/provider/AppContextProvider";

export function OutcomeCategoriesPage({}) {


    const { outcomeHandler } = useAppContext()
    const { categories, getCategories, isLoading } = outcomeHandler

    useEffect(() => {
        (async () => {
            await getCategories()
        })()
    }, []);

    if (isLoading) {
        return <Loading />
    }

    return (<Box isScrollable={true} isContainer={true}>

        <Block marginBottom={10} isAlignCenter={true}>
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




    </Box>)
}