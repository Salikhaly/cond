import React from 'react';

import ResetPasswordForm from '../../../features/auth/password_reset/ResetPassword';
import {Box, Card, CardBody, CardHeader} from "../../../shared/ui";
import {Logo} from "../../../widgets/Logo/Logo";


/**
 * Страница смены пароля.
 * */
export default function ResetPassword(){

    return (<>
        <Box center={true}>
            <Card>
                <CardHeader>
                    <Logo />
                </CardHeader>

                <CardBody>
                    <ResetPasswordForm />
                </CardBody>
            </Card>
        </Box>
    </>);
}