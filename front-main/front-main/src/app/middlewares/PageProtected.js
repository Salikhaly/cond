import React, {useEffect, useMemo} from "react";
import {useNavigate, Navigate} from "react-router-dom";
import {useAppContext} from "../provider/AppContextProvider";
import Logger from "../../shared/internal/Logger";
import {Loading} from "../../widgets/Loading";
import NotFoundPage from "../../pages/NotFoundPage";


export default function PageProtected({children, role=''}) {

    const logger = useMemo(()=>new Logger('PageProtected'), []);

    const { authHandler } = useAppContext()
    const {user, isLoading, isAuth, checkAuth, setLoading} = authHandler
    const navigate = useNavigate()

    //!9OVLa39
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            return navigate('/auth');
        }

        ( async () => {
            console.log("CHECK AUTH: ", await checkAuth() )
        })()

        console.log(JSON.stringify(user))

    }, []);

    if (isLoading) {
        return (<Loading />)
    }

    if (!isAuth) {
        return <Navigate to="/auth" replace />;
    }

    if (user) {
        logger.log('USER', user)
    }

    if (role !== '' && user?.role !== role) {
        return <NotFoundPage />
    }

    return (<>
        {children}
    </>)

}
