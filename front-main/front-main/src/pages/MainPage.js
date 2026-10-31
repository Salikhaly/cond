import React, {useEffect, useState} from 'react'
import {Block, Box, Typography} from "../shared/ui";
import {Drawer} from "../shared/ui";
import useToggle from "../shared/hooks/useToggle";
import {useAppContext} from "../app/provider/AppContextProvider";
import {ProfileInfo} from "../entities/profile/info/ProfileInfo";
import {MainDashboard} from "../widgets/MainDashboard/MainDashboard";
import {EmployeesManage} from "../widgets/EmployeesManage/EmployeesManage";
import MainChart from "../widgets/MainChart/MainChart";

export default function MainPage() {

    const initialIsExpanded = localStorage.getItem('drawerExpanded') === 'true';
    const [isExpanded, toggle] = useToggle(initialIsExpanded);

    useEffect(() => {
        localStorage.setItem('drawerExpanded', isExpanded.toString());
    }, [isExpanded]);


    const { authHandler } = useAppContext();
    const { user, isLoading } = authHandler


    return (<Box isScrollable={true} isContainer={true}>

        <MainDashboard data={user}/>


        {user?.role === 'super_admin' && <>
            <MainChart />

            <Block width={'100%'} marginTop={20}>
                <EmployeesManage employees={[]} />
            </Block>
        </>}
        {/*<Shop items={shopItems} />*/}

        {/*<Drawer toggle={toggle} isExpanded={isExpanded} title={<><span>🤖</span> Virtual Assistant</>}>*/}
        {/*    <Messenger isFromDrawer={true} />*/}
        {/*</Drawer>*/}
    </Box>)
}