import React from 'react';

import styles from './NavigationAction.module.css'
// import Badge from "../badge/Badge";

export function NavigationAction({number_of_notifications=0, label, icon, active=false, onClick= f=>f}){

    return (
        <button  className={`${styles["bottomNavigationAction"]} ${active ? styles["bottomNavigationAction-active"] : ''}`} onClick={onClick}>
            <span className={styles["bottomNavigationAction--notifications"]}>
                {number_of_notifications > 0 &&
                    <div className={styles.NavigationAction__badge}>
                        {number_of_notifications > 999 ? '999+' : String(number_of_notifications)}
                    </div>
                }
                {icon}
            </span>
            <span className={styles["bottomNavigationAction__label"]}>{label}</span>
        </button>
    );
}

