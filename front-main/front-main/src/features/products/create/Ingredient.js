import React, {useEffect, useState} from "react";
import {Block, Button, Input} from "../../../shared/ui";
import DeleteIcon from "../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";

export function Ingredient({ item={}, index, onChange, onDelete=f=>f }) {

    const [name, setName] = useState(item.name || '')
    const [weight, setWeight] = useState(item.weight || 0)
    const [price, setPrice] = useState(item.price || 0)


    useEffect(() => {
        console.log('INGREDIENTS EDIT', name, weight)
        onChange(index, {name, weight: Number(weight), price: Number(price)})
    }, [name, weight, price]);

    // useEffect(() => {
    //     console.log('INGREDIENTS MOUNT', name, weight)
    //     setName(item.name)
    //     setPrice(item.price)
    //     setWeight(item.weight)
    // }, [item]);


    return (<>
        <Block isInline isAlignCenter marginBottom={8}>
            <Block marginLeft={5} width={'50%'}>
                <Input
                    placeholder={'название'}
                    onChange={e => setName(e.target.value)}
                    value={name}
                    required
                />
            </Block>
            <Block marginLeft={5} width={'22%'}>
                <Input
                    type={'number'}
                    placeholder={'кг/л'}
                    onChange={e => setWeight(e.target.value)}
                    value={weight.toString()}
                    required
                />
            </Block>
            <Block marginLeft={5} width={'28%'}>
                <Input
                    type={'number'}
                    placeholder={'цена'}
                    onChange={e => setPrice(e.target.value)}
                    value={price.toString()}
                    required
                />
            </Block>
            <Button marginLeft={5} size={'small'} isIconic={true} onClick={e => onDelete(index)}><DeleteIcon/></Button>
        </Block>
    </>)
}