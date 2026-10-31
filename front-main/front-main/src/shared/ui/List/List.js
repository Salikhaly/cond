import React from "react";
import styles from './List.module.css'
export function List({ title='',children }) {

    return(<div className={styles.List__wrapper}>
        {title && <h1>{title}</h1>}
        <div className={styles.List}>
            {children}
        </div>
    </div>)
}