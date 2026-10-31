import React, {useEffect} from 'react'
import styles from './Navigation.module.css'
import {useLocation, useNavigate} from "react-router-dom";
import {NavigationAction} from "../../shared/ui";
import {useAppContext} from "../../app/provider/AppContextProvider";
import useToggle from "../../shared/hooks/useToggle";
import LogoutForm from "../../features/auth/logout/LogoutForm";

import MainIcon from '../../shared/assets/icons/home_app_logo_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import OptionsIcon from '../../shared/assets/icons/Property 1=options menu.svg'
import FinanceIcon from '../../shared/assets/icons/finance_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'
import ProductsIcon from '../../shared/assets/icons/Property 1=sth.svg'
import GroupIcon from '../../shared/assets/icons/group_40dp_5F6368_FILL0_wght400_GRAD0_opsz40.svg'

const EmojiIcon = ({emoji}) => {
    return <span style={{fontSize: 24}}>{emoji}</span>
}
export default function Navigation({ notifications=[] }) {

    const navigate = useNavigate();
    const { pathname } = useLocation();

    const { authHandler } = useAppContext()
    const { user } = authHandler

    useEffect(() => {
        console.log('DATA USER', user)
    }, [user]);

    return (<>
        <NavigationAction number_of_notifications={0} label='Главная' icon={<MainIcon />} active={pathname === '/'} onClick={e => navigate('/', {replace: true,})}  />
        {/*{*/}

        {/*    <NavigationAction number_of_notifications={0} label='Сотрудники' icon={<ProfileIcon />} active={pathname.startsWith('/employees')} onClick={e => navigate('/employees', {replace: true,})}  />*/}
        {/*}*/}
        {/*<NavigationAction number_of_notifications={[].length} label='Cart' icon={<CartIcon />} active={pathname.startsWith('/cart')} onClick={e => navigate('/cart', {replace: true,})}  />*/}
        <NavigationAction number_of_notifications={0} label={user?.role === 'super_admin' ? 'Финансы' : 'Отчеты'} icon={<FinanceIcon />} active={pathname.startsWith('/finance')} onClick={e => navigate('/finance', {replace: true,})}  />
        <NavigationAction number_of_notifications={0} label='Товары' icon={<ProductsIcon />} active={pathname.startsWith('/products')} onClick={e => navigate('/products', {replace: true,})}  />
        {user?.role === 'super_admin' &&
            <NavigationAction number_of_notifications={0} label='База' icon={<GroupIcon />} active={pathname.startsWith('/business')} onClick={e => navigate('/business', {replace: true,})}  />
        }
        {/*<NavigationAction number_of_notifications={0} label='Выйти' icon={<OptionsIcon />} active={pathname.startsWith('/profile')} onClick={logoutModalToggle}  />*/}
    </>)
}