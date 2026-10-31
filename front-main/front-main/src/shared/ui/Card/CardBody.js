import React from 'react';

import styles from './Card.module.css'

export function CardBody({children}){

    return (
        <div className={styles["card__body"]}>
            {children}
        </div>
    );
}

