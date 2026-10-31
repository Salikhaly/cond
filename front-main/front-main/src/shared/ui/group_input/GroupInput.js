import React from "react";

import styles from './groupInput.module.css'
export function GroupInput({children}) {
    return(<>
        <div className={styles.GroupInput}>
            {children}
        </div>
    </>)
}