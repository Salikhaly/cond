import React from 'react';

import ActivationForm from '../../../features/auth/activation/Activation';
import {Block, Box, Card, CardBody, CardHeader} from "../../../shared/ui";
import {Logo} from "../../../widgets/Logo/Logo";

/**
 * Страница активации аккаунта.
 *
 * Контекст наблюдает за этой страницей, здесь пользователь всегда не аутентифицирован.
 *
 * Если в контексте не передан токен активации или если он не пришел на почту,
 * то мы дожидаемся аутентификации/загрузки-whoami пользователя и запрашиваем новый e-mail.
 *
 * Если e-mail со ссылкой пришел на почту, то мы переходим по ссылке,
 * нас перенаправляет на /authn/activation с токеном в контексте и сразу отключаем socket,
 * потому что иначе нас может здесь перенаправить на прошлую страницу, что убьет флоу.
 *
 * */
export default function Activation(){

    return (
        <Box center={true} isContainer={true}>

            <Block isAlignCenter={true}>
                <Card maxWidth={600}>
                <CardHeader>
                    <Logo />
                </CardHeader>

                <CardBody>
                    <ActivationForm />
                </CardBody>
                </Card>
            </Block>

        </Box>
    );
}