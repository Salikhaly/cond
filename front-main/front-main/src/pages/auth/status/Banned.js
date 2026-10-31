import React, {useEffect} from 'react';

import {useNavigate} from "react-router-dom";
import Logger from "../../../shared/internal/Logger";
import {useAppContext} from "../../../app/provider/AppContextProvider";

const logger = new Logger('Banned');

/**
 * Автоматически разлогинивает пользователя после
 * */
export default function Banned({ }){
    const navigate = useNavigate();

    const logout = useAppContext().authHandler.logout;

    return (<>
        <h1>[Banned]</h1>

        <button onClick={async e => {
            logger.log(await logout());
            navigate('/');
        }}>logout</button>
    </>);
}