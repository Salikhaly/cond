import React from "react";
import styles from './ToggleTabs.module.css'
export function ToggleTabsItem({name='', isActive=false, onClick=f=>f}) {

    return (<div
        className={`${styles.ToggleTabsItem} ${isActive && styles['ToggleTabsItem--active']}`}
        onClick={onClick}
    >
        {name}
    </div>)
}