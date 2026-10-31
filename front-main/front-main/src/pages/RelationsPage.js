import React, {useState} from "react";
import {Block, Box, Typography} from "../shared/ui";
import {ToggleTabs} from "../shared/ui/ToggleTabs/ToggleTabs";
import {ToggleTabsItem} from "../shared/ui/ToggleTabs/ToggleTabsItem";
import {RelationsManage} from "../widgets/RelationsManage/RelationsManage";

export function RelationsPage() {

    const [tab, setTab] = useState('clients')

    return (<Box isScrollable={true} isContainer={true}>
        <Block marginBottom={10}>
            <Typography size={24} weight={700} text={`База ${tab === 'clients' ? 'клиентов' : 'поставщиков'}`}/>
            {/*<Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>*/}
        </Block>

        <ToggleTabs>
            <ToggleTabsItem name={'Клиенты'} isActive={tab === 'clients'} onClick={e => setTab('clients')}/>
            <ToggleTabsItem name={'Поставщики'} isActive={tab === 'suppliers'} onClick={e => setTab('suppliers')}/>
        </ToggleTabs>

        <Block marginTop={20}>
            {tab === 'clients' &&
                <RelationsManage category={'clients'} />}
            {tab === 'suppliers' &&
                <RelationsManage category={'suppliers'} />
            }
        </Block>

    </Box>)
}