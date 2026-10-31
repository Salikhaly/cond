import React, {useEffect, useState} from 'react';
import {useNavigate} from "react-router-dom";
import {useAppContext} from "../../../app/provider/AppContextProvider";
import Logger from "../../../shared/internal/Logger";

const logger = new Logger('Logout');

export default function Logout(){

    const navigate = useNavigate();

    const { authHandler } = useAppContext()
    const { logout } = authHandler;

    logger.log(logout());
    navigate('/');

    // return (<>
    //     <h1>[Logout page]</h1>
    //
    //     <button onClick={async e => {
    //         logger.log(await logout());
    //         navigate('/');
    //     }}>Logout</button>
    // </>);
}

/*
▄───▄
█▀█▀█
█▄█▄█
─███──▄▄
─████▐█─█
─████───█
─▀▀▀▀▀▀▀
*/