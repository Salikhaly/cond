import React from "react";

import styles from './Grid.module.css'
export function Grid({children, columnGap=8, rowGap=8, repeat=2, isForBooks}) {

    // hard style css, media queries is not working, 'cause I have removed style attribute
    const style = {
        position: 'relative',
        display: 'grid',
        gridColumnGap: columnGap,
        gridRowGap: rowGap,
        gridTemplateColumns: 'repeat('+repeat+', minmax(0, 1fr))',
    }

    return (
        <div className={`${styles['grid']} ${isForBooks && styles['grid--isForBooks']}`} >
            {children}
        </div>
    )
}
