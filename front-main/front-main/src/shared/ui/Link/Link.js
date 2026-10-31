import React from 'react';

import styles from './Link.module.css'

export function Link({
                                 text='',
                                 // href='',
                                 onClick=f=>f,
                                size=16
                             }){

    return (
        <span
            className={styles.link}
            // href={href}
            onClick={onClick}
            style={{fontSize: size}}
        >
            {text}
        </span>
    );
}

