import React from "react";
import styles from './Block.module.css'
export function Block({
    children,
    width='100%',
    marginTop=0,
    marginBottom=0,
    marginLeft=0,
    marginRight=0,
    padding=0,
    isInline=false,
    justifyContent='start', // 'start', 'end', 'center', 'space-between'
    alignItems='start', // 'start', 'end', 'center',
    isMobileMode=false,
    isAlignCenter=false,
    isAir=false
}) {

    return (<div
        style={{
            width,
            display: 'flex',
            flexDirection: isInline ? 'row' : 'column',
            marginBottom,
            marginLeft,
            marginRight,
            marginTop,
            justifyContent,
            alignItems: isAlignCenter ? 'center' : alignItems,
            padding
        }}
        className={`
            ${isMobileMode && styles['Block--mobile']}
            ${isAir && styles['Block--air']}
        `}
    >
        {children}
    </div>)
}