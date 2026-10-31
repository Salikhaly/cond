import React from 'react';

import styles from "./Overlay.module.css"
import {createPortal} from "react-dom";

const appRoot = document.getElementById('root');
export function Overlay({children}){

    return createPortal(<>
        <div className={styles.overlay}>{children}</div>
        <div className={styles["Overlay-content"]}>
            {children}
        </div>
    </>, appRoot);
}