import React from "react";

import {useAppContext} from "../../../app/provider/AppContextProvider";
import Logger from "../../../shared/internal/Logger";
import {Block, Button, GroupButtons, Modal, Typography} from "../../../shared/ui";
const logger = new Logger('Logout');
export default function LogoutForm({onClose=f=>f}) {

    const { authHandler } = useAppContext();
    const { logout } = authHandler;

    async function logoutHandle() {
        logger.log(await logout());
        onClose()
    }

        return(<>
        <Modal minWidth={360} maxWidth={400} onClose={onClose}>
            <Block isAlignCenter={true}>
                <Typography weight={700} size={24} bottom={12} align={'center'} text={'Вы точно хотите выйти из аккаунта?'} />
                {/*<Typography weight={500} size={16} color={'#65727D'} align={'center'}>Мы можем помочь вам найти вам идеальный вариант согласно вашим запросам</Typography>*/}
            </Block>

            <GroupButtons top={20}>
                <Button onClick={logoutHandle}>Выйти</Button>
                <Button marginTop={8} variant={'cancel'} onClick={onClose}>Отмена</Button>
            </GroupButtons>
        </Modal>
    </>)
}