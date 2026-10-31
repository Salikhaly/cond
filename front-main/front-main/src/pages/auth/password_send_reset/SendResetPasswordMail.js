import React from 'react'
import {useNavigate} from "react-router-dom";

import SendResetPasswordMailForm from '../../../features/auth/password_send_reset/SendResetPasswordMail';
import {Block, Box, Card, CardBody, CardFooter, CardHeader, TextWithLink} from "../../../shared/ui";
import {Logo} from "../../../widgets/Logo/Logo";


export default function SendResetPasswordMail(){

    const navigate = useNavigate();

    return (<>
        <Box center={true} isContainer={true}>
            <Block isAlignCenter={true}>
                <Card maxWidth={600}>
                    <CardHeader>
                        <Logo />
                    </CardHeader>

                    <CardBody>
                        <SendResetPasswordMailForm />
                    </CardBody>

                    <CardFooter>
                        <TextWithLink text="Уже есть аккаунт?" linktext="Авторизация" onClick={e => navigate('/authn', {replace:true})} />
                    </CardFooter>
                </Card>
            </Block>
        </Box>
    </>);
}
