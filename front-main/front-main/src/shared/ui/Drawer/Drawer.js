import React, {useEffect, useState} from "react";
import styles from "./Drawer.module.css";
import BackIcon from "../../assets/icons/Property 1=arrow.svg";
import useAdaptive from "../../hooks/adaptive/useAdaptive";
import {Overlay} from "../Overlay/Overlay";
import {createPortal} from "react-dom";
const appRoot = document.getElementById('root');

const RotatedIcon = ({ angle, Icon }) => {
    return <div className={styles.Drawer__header__expand_icon} style={{rotate: `${angle}deg`}}><BackIcon /></div>
}

export function Drawer({onClose=f=>f, children, isDrawerActive=false, variant=''}){

    const containerHeight = window.innerHeight;

    const [drawerStatus, setDrawerStatus] = useState('medium-extend')
    const [startY, setStartY] = useState(null);
    const [currentY, setCurrentY] = useState(null);
    const [drawerHeight, setDrawerHeight] = useState(containerHeight*0.2); // Начальная высота панели

    // Ограничиваем минимальную и максимальную высоту панели в процентах
    const minHeight = containerHeight * 0.2;
    const maxHeight = containerHeight * 0.8;

    const scrollableComponent = document.getElementById('fullPageContainer')


    const handleTouchStart = (event) => {
        // console.log('TOOOUCH DRAWER HEADER')
        // scrollableComponent.style.overflowY = 'hidden';
        // event.preventDefault(); // Предотвращаем прокрутку страницы
        setStartY(event.touches[0].clientY);
        setCurrentY(event.touches[0].clientY);
        // event.preventDefault(); // Предотвращаем прокрутку страницы

    };

    const handleTouchMove = (event) => {
        // event.preventDefault(); // Предотвращаем прокрутку страницы
        setCurrentY(event.touches[0].clientY);
        if (startY) {
            const deltaY = event.touches[0].clientY - startY;
            const newHeight = drawerHeight - deltaY;
            // const newHeight = drawerHeight - (deltaY / containerHeight) * 100;

            if (newHeight >= minHeight && newHeight <= maxHeight) {
                setDrawerHeight(newHeight);
            }

            setCurrentY(event.touches[0].clientY);
        }
        // scrollableComponent.style.overflowY = 'auto';

    };

    const handleTouchEnd = () => {
        if (startY && currentY) {
            const deltaY = currentY - startY;
            if (deltaY < -20) {
                // setDrawerStatus('full-extend')
                // onClose(); // Раскрываем панель при свайпе вверх
            } else if (deltaY > 20) {
                if (!isDrawerActive) {
                    // if (drawerStatus === 'medium-extend') {
                    // setDrawerStatus('hidden')
                    // onClose(false)
                    return
                }
                // setDrawerStatus('medium-extend')
                onClose(); // Закрываем панель при свайпе вниз
            }
        }
        setStartY(null);
        setCurrentY(null);
        // scrollableComponent.style.overflowY = 'auto';
    };

    // useEffect(() => {
    //     if (isExtended) {
    //         setDrawerHeight(drawerHeight * 0.8)
    //     } else {
    //         setDrawerHeight(drawerHeight * 0.2)
    //     }
    // }, [isExtended]);

    // const [extended, setExtended] = useState(true);

    // useEffect(() => {
    //
    // }, [drawerHeight]);

    // const drawerStyle = {
    //     height: `${drawerHeight}px`,
    // };

    //${drawerStatus === 'medium-extend' && isDrawerActive && styles['Drawer--medium-extend']}

    // const containerHeight = window.innerHeight;
    // const [startY, setStartY] = useState(null);
    // const [initialHeight, setInitialHeight] = useState(containerHeight * 0.2); // Начальная высота панели
    // const [drawerHeight, setDrawerHeight] = useState(containerHeight * 0.2);
    //
    // // Ограничиваем минимальную и максимальную высоту панели
    // const minHeight = containerHeight * 0.2;
    // const maxHeight = containerHeight * 0.8;
    //
    // const handleTouchStart = (event) => {
    //     // Фиксируем начальную координату касания и текущую высоту панели
    //     setStartY(event.touches[0].clientY);
    //     setInitialHeight(drawerHeight);
    // };
    //
    // const handleTouchMove = (event) => {
    //     if (startY !== null) {
    //         const touchY = event.touches[0].clientY;
    //         const deltaY = startY - touchY;
    //         const newHeight = initialHeight + deltaY;
    //
    //         // Ограничиваем изменение высоты в заданных пределах
    //         if (newHeight >= minHeight && newHeight <= maxHeight) {
    //             setDrawerHeight(newHeight);
    //         }
    //     }
    // };
    //
    // const handleTouchEnd = () => {
    //     setStartY(null); // Сбрасываем начальную позицию после завершения касания
    // };

    return (createPortal(<>
        {isDrawerActive && <Overlay /> }

        <div className={`
                ${styles.Drawer} 
                ${variant === 'clear' && styles['Drawer--clear']}
                ${isDrawerActive && styles['Drawer--extended']}
            `}
            // style={{ height: `${drawerHeight}px` }} // Устанавливаем высоту панели
        >
            {/*<div className={styles.Drawer__buttons}>*/}
            {/*    /!*<Button width={'100%'} variant={'outline'} onClick={() => setIsDrawerActive(!isDrawerActive)}>Подробнее</Button>*!/*/}
            {/*</div>*/}
            <div className={styles.Drawer__wrapper}>
                <div className={styles.Drawer__header}
                     onTouchStart={handleTouchStart}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}
                >
                    <span className={styles.Drawer__line}></span>
                </div>
                <div className={styles.Drawer__content}>
                    {children}
                </div>
            </div>
        </div>
    </>, appRoot));
}