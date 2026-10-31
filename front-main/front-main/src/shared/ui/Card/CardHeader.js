import React from 'react';

import styles from './Card.module.css'

export function CardHeader({children}){

    return (
        <div className={styles["card__header"]}>
            {children}
        </div>
    );
}

