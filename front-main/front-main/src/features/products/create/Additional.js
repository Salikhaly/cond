import React, {useEffect, useState} from "react";
import {Block, Button, Input} from "../../../shared/ui";
import DeleteIcon from "../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";

export function Additional({ item={}, index, onChange, onDelete=f=>f }) {

    const [name, setName] = useState(item.name || '')
    const [price, setPrice] = useState(item.price || 0)


    useEffect(() => {
        console.log('Additional EDIT', name, price)
        onChange(index, {name, price: Number(price)})
    }, [name, price]);

    useEffect(() => {
        console.log('INGREDIENTS MOUNT', name, )
        setName(item.name)
        setPrice(item.price)
    }, [item]);


    return (<>
        <Block isInline isAlignCenter marginBottom={8}>
            <Input
                placeholder={'название'}
                onChange={e => setName(e.target.value)}
                value={name}
                required
            />
            <Block marginLeft={5} width={150}>
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