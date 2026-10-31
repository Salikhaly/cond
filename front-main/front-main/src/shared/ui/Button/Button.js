import React from "react";
import styles from './Button.module.css'
export function Button({
    type='button',
    disabled=false,
    onClick=f=>f,
    children,
    width='100%',
    marginTop=0,
    marginBottom=0,
   marginRight=0,
   marginLeft=0,
    isIconic=false,
    borderRadius=6,
    variant='',
                           top = 0,
    size=''
}) {

    marginTop = marginTop || top

    return (<>
        <button
            className={`
                ${styles.Button}
                ${disabled && styles['Button--disabled']}
                ${isIconic && styles['Button--isIconic']}
                ${variant === 'third' && styles['Button--third']}
                ${variant === 'clear' && styles['Button--clear']}
                ${variant === 'cancel' && styles['Button--cancel']}
                ${variant === 'danger' && styles['Button--danger']}
                ${variant === 'outline' && styles['Button--outline']}
                ${variant === 'green' && styles['Button--green']}
                ${size === 'small' && styles['Button--small']}
                ${size === 'small-text' && styles['Button--small-text']}
            `}
            children
            style={{
                width,
                marginTop,
                marginBottom,
                marginRight,
                marginLeft,
                borderRadius
            }}
            disabled={disabled}
            onClick={onClick}
            type={type}
        >
            {children}
        </button>
    </>)
}