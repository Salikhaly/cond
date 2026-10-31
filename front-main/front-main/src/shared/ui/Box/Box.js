import React from 'react'
import styles from './Box.module.css'

export function Box ({
    isHorizontalCenter = false,
    isVerticalCenter = false,
    center=false,
    height,
    padding,
    children,
    isContainer=false,
    isScrollable=false
}) {

    // TODO box centering + classNames helper

    return (<div className={`
        ${styles.Box}
        ${isHorizontalCenter || center && styles['Box--horizontalCenter']}
        ${isVerticalCenter || center && styles['Box--verticalCenter']}
        ${isContainer && styles['Box--isContainer']}
    `} style={ {height, padding, overflow: isScrollable ? 'auto' : 'hidden'} }>
        {children}
    </div>)
}