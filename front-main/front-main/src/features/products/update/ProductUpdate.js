import React, {useEffect, useState} from "react";
import {Block, Button, GroupButtons, GroupInput, Input, Modal, Typography} from "../../../shared/ui";
import DeleteIcon from "../../../shared/assets/icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg";
import AddIcon from "../../../shared/assets/icons/add_20dp_5F6368_FILL0_wght400_GRAD0_opsz20.svg";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import styles from "../create/ProductCreate.module.css";
import {Ingredient} from "../create/Ingredient";
import {Additional} from "../create/Additional";
import {Loading} from "../../../widgets/Loading";
import axios from "axios";

const API_URL = process.env.API_URL_DEV

export function ProductUpdate({data, onClose=f=>f}) {


    const { productsHandler } = useAppContext()
    const { updateProduct, getProducts } = productsHandler

    const [name, setName] = useState(data.name || '')
    // const str = data.ingredients
    // const array_ingredients = str.split(",")
    // console.log('INGREDIENTS', array_ingredients)

    const [ingredients, setIngredients] = useState(data.ingredients || [])
    const [additional, setAdditional] = useState(data.additional || [])
    const [weight, setWeight] = useState(data.weight || 1)
    const [quantity, setQuantity] = useState(data.quantity || '0')
    const [priceTotal, setPriceTotal] = useState(data.priceTotal || 0)
    const [priceForEmployee, setPriceForEmployee] = useState(data.priceForEmployee || '')
    const [weightTotal, setWeightTotal] = useState(data.priceTotal || 0)

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(API_URL + data.image || null);
    const [progress, setProgress] = useState(0);

    function addIngredient(text) {
        setIngredients([...ingredients, text])
    }
    function addAdditional(item) {
        setAdditional([...additional, item])
    }

    useEffect(() => {
        console.log('PRODUCT', data)
    }, []);


    useEffect(()=> {
        console.log('INGREDIENTS', ingredients)
        let totalPrice = 0
        let totalWeight = 0
        if (ingredients.length > 0) {
            ingredients.map( i => {
                const price = Number(i.weight) * Number(i.price)
                totalPrice += Number(price.toFixed(2))
                totalWeight += Number(i.weight)
                console.log('INGRE SUMS: ', i, totalPrice)
            })
        }
        if (additional.length > 0) {
            additional.map( i => {
                totalPrice += Number(i.price)
            })
        }
        if (totalWeight === 0 || totalPrice === 0) {
            setPriceTotal(0)
        } else {
            // setPriceTotal((Number(totalPrice) / Number(totalWeight)).toFixed(2))
            setPriceTotal(Number(totalPrice).toFixed(2))
        }
        setWeightTotal(totalWeight)
    }, [ingredients, additional])


    async function onUpdate() {

        if (name === '' || !quantity) {
            console.log('SOME VALIDATION ERROR in CREATE PRODUCT');
            return;
        }

        // if (!selectedFile) {
        //     console.log('Пожалуйста, выберите файл для загрузки');
        //     return;
        // }

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('name', name);
        formData.append('priceForEmployee', priceForEmployee);
        formData.append('quantity', quantity);
        formData.append('ingredients', JSON.stringify(ingredients));
        formData.append('additional', JSON.stringify(additional));
        formData.append('weight', Number(weight));

        console.log('PRODUCT FORM DATA', formData);

        // Выводим данные FormData в консоль
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        // Устанавливаем состояние для отслеживания загрузки
        let isUploading = true;

        try {
            const response = await axios.put(API_URL + `/products/${data.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Прогресс загрузки
                onUploadProgress: (progressEvent) => {
                    // if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    // console.log(`Загружено: ${percent}%`);
                    setProgress(percent);
                    // }
                },
            });

            // Проверка успешности ответа
            if (response.status !== 200) {
                throw new Error('Ошибка при загрузке изображения');
            }

            console.log('Успешно загружено:', response.data);

        } catch (e) {
            console.error('Ошибка:', e);
            alert('Произошла ошибка при загрузке. Пожалуйста, попробуйте снова.');
        } finally {
            // Вне зависимости от успеха загрузки, обновляем данные и закрываем форму
            await getProducts();
            onClose();
            isUploading = false;
        }
    }


    async function updateHandle() {
        await onUpdate()
        onClose()
    }

    const updateItemByIndex = (index, newValue) => {
        const updatedItems = ingredients.map((item, i) =>
            i === index ? newValue : item
        );
        setIngredients(updatedItems);
    };

    const updateAddByIndex = (index, newValue) => {
        const updatedItems = additional.map((item, i) =>
            i === index ? newValue : item
        );
        console.log('ADDITIONAL UPDATE ITEM: ', updatedItems, newValue, index)
        setAdditional(updatedItems);
    };

    const deleteItemByIndex = (index) => {
        const updatedItems = ingredients.filter((_, i) => i !== index);
        setIngredients(updatedItems);
    };

    const deleteAddByIndex = (index) => {
        const updatedItems = additional.filter((_, i) => i !== index);
        setAdditional(updatedItems);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);

        // Предпросмотр изображения
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    return (<>
        {progress > 0 && <Loading isProgress={true} progress={progress} />}

        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={18} align={'center'} text={'Изменение товара'} />

                <GroupInput>
                    <label>Название: </label>
                    <Input
                        name={'name'}
                        type={'text'}
                        onChange={e => setName(e.target.value)}
                        value={name}
                        placeholder={'Введите название товара'}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Оплата за кг сотруднику: </label>
                    <Input
                        type={'number'}
                        onChange={e => setPriceForEmployee(e.target.value)}
                        value={priceForEmployee}
                        placeholder={'Введите оплату'}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}></Block>

                <GroupInput>
                    <label>Вес 1 коробки товара:</label>
                    <Input
                        type={'number'}
                        onChange={e => setWeight(e.target.value)}
                        value={weight.toString()}
                        placeholder={'Введите цену'}
                        required
                    />
                </GroupInput>

                <Block marginTop={15}>
                    <GroupInput>
                        <label>Количество</label>
                        <Input
                            name={'quantity'}
                            type={'number'}
                            onChange={e => setQuantity(e.target.value)}
                            value={quantity}
                            placeholder={'Введите количество товара'}
                            min={1}
                            required
                        />
                    </GroupInput>
                </Block>

                <Block marginTop={15} isAlignCenter={false}>
                    <label>Изображение:</label>

                    <label className={styles['input-file']}>
                        {/*<span className={styles["input-file-text"]} type="text"></span>*/}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            required
                            name="file"
                        />
                        <span className={styles["input-file-btn"]}>{selectedFile ? selectedFile.name : 'Выберите файл'}</span>
                    </label>
                    {/*<input*/}
                    {/*    type="file"*/}
                    {/*    accept="image/*"*/}
                    {/*    onChange={handleFileChange}*/}
                    {/*    required*/}
                    {/*    className={styles['input-file']}*/}
                    {/*/>*/}
                    {preview && <img src={preview} alt="Предпросмотр" width="200" />}
                </Block>

                <Block marginTop={15}>
                    <GroupInput>
                        <Typography weight={600} size={16} bottom={10} align={'center'} text={`Состав: `} />

                        <Block>
                            {ingredients.map((i, key) => {

                                return <Ingredient key={key} index={key} item={i} onChange={updateItemByIndex} onDelete={deleteItemByIndex} />
                            })}
                        </Block>

                        <Button
                            marginTop={6}
                            onClick={e => addIngredient({name: `Состав ${ingredients.length + 1}`, weight: 0})}
                            width={'fit-content'}
                            isIconic
                        >
                            <AddIcon/>
                        </Button>

                    </GroupInput>
                </Block>
            </Block>

            <Block marginTop={15}>
                <GroupInput>
                    <Typography weight={600} size={16} bottom={10} align={'center'} text={`Дополнительно: `} />

                    <Block>
                        {additional.map((i, key) => {

                            return <Additional key={key} index={key} item={i} onChange={updateAddByIndex} onDelete={deleteAddByIndex} />
                        })}
                    </Block>

                    <Button
                        marginTop={6}
                        onClick={e => addAdditional({name: `Дополнительно ${additional.length + 1}`, price: 0})}
                        width={'fit-content'}
                        isIconic
                    >
                        <AddIcon/>
                    </Button>

                </GroupInput>
            </Block>

            <Block marginTop={15}>
                {/*<Typography weight={600} size={18} bottom={10} align={'center'} text={`Общий вес: ${weightTotal}`} />*/}
                <Typography weight={600} size={18} bottom={10} align={'center'} text={`Итоговая цена: ${priceTotal}`} />
            </Block>

            <GroupButtons top={20}>
                <Button onClick={updateHandle}>Сохранить</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>

    </>)
}