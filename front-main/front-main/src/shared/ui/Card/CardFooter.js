import React from 'react';

import styles from './Card.module.css'

export function CardFooter({children}){

    return (
        <div className={styles["card__footer"]}>
            {children}
        </div>
    );
}

