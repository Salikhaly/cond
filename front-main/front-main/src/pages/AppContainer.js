import React, {useEffect} from "react";
import Header from "../widgets/Header/Header";
// import {Box} from "../shared/ui";
import Navigation from "../widgets/Navigation/Navigation";
import {BottomNavigation} from "../shared/ui/navigation/BottomNavigation/BottomNavigation";
import useAdaptive from "../shared/hooks/adaptive/useAdaptive";
import {useAppContext} from "../app/provider/AppContextProvider";

export default function AppContainer({children}) {

    const { device } = useAdaptive()


    const { authHandler } = useAppContext()
    const { user } = authHandler

    useEffect(() => {
        console.log('DATA USER', user)
    }, [user]);


    return (<>
        {/*<Header />*/}
        {children}

        {/*{(device === 'mobile' || device === 'tablet') &&*/}
        { user?.name && <>
            <BottomNavigation>
                <Navigation notifications={[]} />
            </BottomNavigation>
        </>
        }
        {/*}*/}
    </>)
}