import React from "react";
import styles from './ProfileInfo.module.css'
import {Block, Typography} from "../../../shared/ui";
export function ProfileInfo({data={}}) {

    const { name='', email='' } = data

    const roleText = data.role === 'super_admin' ? 'СУПЕР АДМИН' : 'Сотрудник'

    return (<div className={styles.ProfileInfo}>
        <Block>
            <Typography size={18} weight={600} text={name}/>
            <Typography marginTop={10} size={16} weight={400} text={email}/>
            <Typography marginTop={10} size={16} color={'grey'} weight={400} text={roleText}/>
        </Block>
    </div>)
}