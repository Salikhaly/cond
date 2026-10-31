import React, {useContext, useEffect, useMemo, useState} from "react";
import {useAppContext} from "../provider/AppContextProvider";
import Logger from "../../shared/internal/Logger";
import {Loading} from "../../widgets/Loading";

export default function Page({children}) {

    const logger = useMemo(()=>new Logger('Page'), []);
    const { authHandler } = useAppContext()
    const {user, isLoading,setLoading, isAuth, checkAuth} = authHandler

    useEffect(() => {
        logger.log('user', user)
        // if (user !== null) {
            if(localStorage.getItem('token')) {

                ( async () => {
                    console.log("CHECK AUTH: ", await checkAuth() )
                })()
                // console.log(user)
            } else {
                setLoading(false)
            }

        // }
        // console.log(user)
        // console.log(isAuth)

    }, []);

    if (isLoading) {
        return (<Loading />)
    }
    else {
        return (<>
            {children}
        </>)
    }




}