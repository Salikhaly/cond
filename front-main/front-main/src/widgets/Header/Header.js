// import React from 'react'
// import styles from './Header.module.css'
// // import {SearchInHeader} from "../../features/SearchInHeader/SearchInHeader";
// import {Block, NavigationAction} from "../../shared/ui";
// import Navigation from "../Navigation/Navigation";
// import {useLocation, useNavigate} from "react-router-dom";
// import useAdaptive from "../../shared/hooks/adaptive/useAdaptive";
//
//
// import MainIcon from '../../shared/assets/icons/Property 1=sth.svg'
// import OrdersIcon from '../../shared/assets/icons/Property 1=orders.svg'
// import ProfileIcon from '../../shared/assets/icons/Property 1=profile.svg'
// import CartIcon from '../../shared/assets/icons/Property 1=new.svg'
// import FavIcon from '../../shared/assets/icons/Property 1=heart.svg'
// import {useAppContext} from "../../app/provider/AppContextProvider";
//
// const EmojiIcon = ({emoji}) => {
//     return <span style={{fontSize: 24}}>{emoji}</span>
// }
//
// export default function Header({ notifications=[] }) {
//
//     const navigate = useNavigate();
//     const { pathname } = useLocation();
//     const { device } = useAdaptive()
//
//     const { cartHandler, favHandler, } = useAppContext()
//
//     return (<div className={styles.Header}>
//         { device === 'desktop' &&
//             <Block width={'10%'} marginRight={10} isInline>
//                 <NavigationAction label='Shop' icon={<MainIcon />} active={pathname === '/'} onClick={e => navigate('/', {replace: true,})}  />
//             </Block>
//         }
//
//         <SearchInHeader />
//
//         { device === 'desktop' &&
//             <Block width={'40%'} isInline>
//                 <NavigationAction number_of_notifications={0} label='Orders' icon={<OrdersIcon />} active={pathname.startsWith('/profile/orderlist')} onClick={e => navigate('/profile/orderlist', {replace: true,})}  />
//                 <NavigationAction number_of_notifications={favHandler.favItems.length} label='Favourites' icon={<FavIcon />} active={pathname.startsWith('/profile/favorites')} onClick={e => navigate('/profile/favorites', {replace: true,})}  />
//                 <NavigationAction number_of_notifications={cartHandler.cartItems.length} label='Cart' icon={<CartIcon />} active={pathname.startsWith('/cart')} onClick={e => navigate('/cart', {replace: true,})}  />
//                 <NavigationAction number_of_notifications={0} label='Profile' icon={<ProfileIcon />} active={pathname === '/profile'} onClick={e => navigate('/profile', {replace: true,})}  />
//             </Block>
//         }
//     </div>)
// }