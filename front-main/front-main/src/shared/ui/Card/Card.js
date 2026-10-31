import React from 'react';

import styles from './Card.module.css'

export function Card({children, variant='standard', top, bottom, maxWidth, forAuth, minWidth}){

    const style = {
        minWidth,
        maxWidth,
        marginTop: top,
        marginBottom: bottom,
    }

    return (
        <div className={`${styles.card} ${variant === 'standard' ? '' : styles['card--info'] } ${forAuth && styles['card--forauth']}`} style={style}>
            {children}
        </div>
    );
}

