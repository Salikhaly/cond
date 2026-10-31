import React from "react";
import styles from './ToggleTabs.module.css'
export function ToggleTabs({children}) {


    return (<div className={styles.ToggleTabs}>
        {children}
    </div>)
}