import React from "react";
import styles from './ItemCheckbox.module.css'
export function ItemCheckbox({ item={}, onCheck=f=>f, isActive=false }) {



    return (<>
        <div className={styles.ItemCheckbox}>
            <input id={`category-${item.id}`} type="checkbox" value={item.id} checked={isActive} onChange={e => onCheck(item)} />
            <label htmlFor={`category-${item.id}`}>{item.name}</label>
        </div>
    </>)
}