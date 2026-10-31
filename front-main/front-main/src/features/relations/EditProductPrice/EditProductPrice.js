import React, {useState} from "react";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import {Block, Button, Grid, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import {Search} from "../../../widgets/Search/Search";
import {ProductItem} from "../../../entities/products/item/ProductItem";

export function EditProductPrice({ selectedProduct, relationId=0, onClose=f=>f}) {

    console.log('RELATIONS PRODUCT ITEM EditProductPrice relationId', relationId)

    const { relationsHandler } = useAppContext()
    const { updateRelationProduct, getRelationsProducts } = relationsHandler

    const [price, setPrice] = useState(selectedProduct.price || null)

    async function onUpdate() {
        if (price == '') {
            console.log('SOME VALIDATION ERROR in EditProductPrice')
            return
        }
        console.log('PARAMSSSSS', {relationId, productId: selectedProduct.id, price})
        const response = await updateRelationProduct({relationId, productId: selectedProduct.id, price})
        console.log('RELATION UPDATE', response)
        await getRelationsProducts({relationId})
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    return (<>

        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Присвоить товар'} />
            </Block>


            <Block>
                {selectedProduct?.image && <img src={selectedProduct?.image} alt="Предпросмотр" width="200" />}
                <GroupInput>
                    <label>Название</label>
                    <Input
                        type={'text'}
                        disabled
                        value={selectedProduct.name}
                        required
                    />
                </GroupInput>

                <GroupInput>
                    <label>Укажите цену</label>
                    <Input
                        name={'price'}
                        type={'number'}
                        onChange={e => setPrice(e.target.value)}
                        value={price}
                        placeholder={'Введите цену товара'}
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