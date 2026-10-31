import React from "react";
import styles from './Chip.module.css'
export function Chip({text=''}) {

    if (!text) return ;

    return (<span className={styles.Chip}>
        {text}
    </span>)
}