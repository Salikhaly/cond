import React, {useEffect, useState} from "react";
import {Block, Box, Button, Drawer, Typography} from "../shared/ui";
import {ToggleTabs} from "../shared/ui/ToggleTabs/ToggleTabs";
import {ToggleTabsItem} from "../shared/ui/ToggleTabs/ToggleTabsItem";
import {useAppContext} from "../app/provider/AppContextProvider";
import {Reports} from "../widgets/Reports/Reports";
import {Loading} from "../widgets/Loading";
import {ReportsForAdmin} from "../widgets/Reports/ReportsForAdmin";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {Outcomes} from "../widgets/Outcomes/Outcomes";
import useAdaptive from "../shared/hooks/adaptive/useAdaptive";
import {Incomes} from "../widgets/Incomes/Incomes";

export function FinancePage() {

    const {device} = useAdaptive()

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const tabUrl = searchParams.get('tab');

    const { authHandler } = useAppContext();
    const { user, isLoading } = authHandler

    const [tab, setTab] = useState(tabUrl || 'reports')



    const handleTabClick = (name) => {
        setSearchParams({ tab: name });
        setTab(name)
    };

    useEffect(() => {
        // handleTabClick('reports')
    }, []);


    if (isLoading) {
        return <Loading />
    }

    return (<Box isScrollable={true} isContainer={true} padding={0}>

        <Block marginBottom={10} padding={'20px 20px 0 20px'}>
            <Typography size={24} weight={700} text={user?.role === 'super_admin' ? 'Финансы' : 'Отчеты'}/>
            {/*<Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>*/}
        </Block>

        {user?.role === 'super_admin' && <Block padding={'0 20px'} >
            <ToggleTabs>
                <ToggleTabsItem name={'Отчетность'} isActive={tab === 'reports'} onClick={e => handleTabClick('reports')}/>
                <ToggleTabsItem name={'Доходы'} isActive={tab === 'income'} onClick={e => handleTabClick('income')}/>
                <ToggleTabsItem name={'Расходы'} isActive={tab === 'outcome'} onClick={e => handleTabClick('outcome')}/>
            </ToggleTabs>
        </Block>}

            {tab === 'reports' && <Block padding={'0 20px'} marginTop={20}>
                {user?.role === 'super_admin' ? <ReportsForAdmin/> : <Reports />}

            </Block>
            }
            {user?.role === 'super_admin' && tab === 'income' && <>
                <Incomes />

            </>}
            {user?.role === 'super_admin' && tab === 'outcome' && <>
                {/*Расходы*/}
                <Block marginTop={20} padding={'0 20px'}>
                    <Button onClick={e => navigate(`/outcome/categories`)}>Управление категориями</Button>
                </Block>

                <Outcomes />
            </>}



    </Box>)
}