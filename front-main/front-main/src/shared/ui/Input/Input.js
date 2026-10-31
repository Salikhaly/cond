import React, {useRef, useState} from "react";

import styles from './Input.module.css'
import EyeOffIcon from './icons/visibility_off_FILL0_wght400_GRAD0_opsz48.svg';
import EyeIcon from './icons/visibility_FILL0_wght400_GRAD0_opsz48.svg'
import ClearIcon from './icons/close_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'

export function Input({
                          name='',
                          type='text',
                          value='',
                          placeholder='Input value',
                          required=false,
                          onChange=f=>f,
                          borderRadius=8,
                          onClick=f=>f,
                          onFocus=f=>f,
                          paddingLeft,
                          autocomplete,
    isIcon=false,
    isClearable=false,
    Icon,
    isAnotherChange=false,
    isAir=false,
    disabled=false
                      }) {

    const [_type, setType] = useState(type);
    function handleToggle() {
        if (type === 'password') {
            _type === 'password' ? setType('text') : setType('password');
        }
    }

    const inputRef = useRef()

    function clear() {
        // if (inputRef.current) {
        //     inputRef.current.value = ''
        // }
        if (isAnotherChange) {
            onChange('')
        }
    }

    return (<div className={`${styles['input-wrapper']}`}>
        {isIcon && <span className={`${styles['input-icon']} ${styles['input-icon--first']}`}>
            {Icon}
        </span>}
        <input
            name={name}
            type={_type}
            placeholder={placeholder}
            value={value}
            onChange={ isAnotherChange ? e => onChange(e.target.value) : onChange}
            required={required}
            className={`${styles.Input} ${isIcon && styles['input--icon']} ${isClearable && styles['input--clearable']}`}
            style={{
                borderRadius,
                paddingLeft
            }}
            onClick={onClick}
            onFocus={onFocus}
            autoComplete={autocomplete}
            ref={inputRef}
            disabled={disabled}
        />
        {isClearable && value !=='' && <span className={styles['input-clear']} onClick={clear}>
            <ClearIcon />
        </span>}
        {type === 'password' && <>
            <span className={styles['input-icon']} onClick={handleToggle}>
                {_type === 'password' ? <EyeOffIcon/> : <EyeIcon/>}
            </span>
        </>}
    </div>)
}