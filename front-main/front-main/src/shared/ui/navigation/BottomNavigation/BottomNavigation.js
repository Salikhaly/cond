import React from 'react'
import styles from './BottomNavigation.module.css'

export function BottomNavigation({ children }) {

    return (<div className={styles.BottomNavigation}>
        {children}
    </div>)
}