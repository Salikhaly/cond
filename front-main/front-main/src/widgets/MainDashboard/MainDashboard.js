import React from "react";
import {Block, Button, Typography} from "../../shared/ui";
import {ProfileInfo} from "../../entities/profile/info/ProfileInfo";
import useToggle from "../../shared/hooks/useToggle";
import LogoutForm from "../../features/auth/logout/LogoutForm";

export function MainDashboard({data}) {

    const [ isLogoutModalToggleActive, logoutModalToggle ] = useToggle()

    return(<>
        { isLogoutModalToggleActive && <LogoutForm onClose={logoutModalToggle}/>}

        <Block marginBottom={20}>
            <Typography size={24} weight={700} text={'Общая информация'}/>
            <Typography size={16} weight={400} marginTop={2} text={'Ваши персональные данные'}/>
        </Block>

        <ProfileInfo data={data} />

        <Block marginTop={10}>
            <Button variant={'danger'} onClick={logoutModalToggle}>Выйти</Button>
        </Block>
    </>)
}