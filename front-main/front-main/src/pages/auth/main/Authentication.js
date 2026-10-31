import React, {useContext, useEffect, useMemo, useState} from 'react';

import SignIn from '../../../features/auth/signin/Signin';
import SendActivationMail from "../../../features/auth/activation_send/SendActivationMail";

import {useAppContext} from "../../../app/provider/AppContextProvider";
import {Block, Box, Card, CardBody, CardHeader, Typography} from "../../../shared/ui";
/*
* 1) Не всегда при OAuth2 имеется имя, а в приложении хотелось бы иметь имя всегда.
* Для этого нужно, если нет имени пользователя, перенаправлять на страницу
* */
/**
 * type: [signin, sendActivationMail]
 * */
const Authentication = () => {

    // const navigate = useNavigate();
    const { authHandler } = useAppContext()
    const { setError, authState, isAuth,status } = authHandler;

    // const logger = useMemo(()=>new Logger('Authentication'), []);

    const [tabType, setTabType] = useState('signin');

    useEffect(() => {
        if (authState.type === 'signin') {
            setTabType('signin')
        } else if (authState.type === 'signup') {
            setTabType('signup')
        } else {
            setTabType('signin')
        }
    }, []);

    if (isAuth) {
        return window.location.replace('/');
    } else {

        // SignUp/SignIn должны быть в одном компоненте и OAuth тоже, все должно быть в одном Authentication page
        return (<Box center={true} isContainer={true}>

            <Block isAlignCenter={true}>
                <Card maxWidth={600}>
                    <CardHeader>
                        {/*<Logo />*/}
                        <Block isAlignCenter={true}>
                            {status && <Typography align={'center'} size={28} weight={600} text={'Введите код'} />}
                            {tabType === 'signin' && !status && <Typography align={'center'} size={28} weight={600} text={'Добро пожаловать'} />}
                        </Block>
                    </CardHeader>

                    <CardBody>
                        {tabType === 'signup' && <SendActivationMail />}
                        {tabType === 'signin' && <SignIn />}
                        <br />
                        {/*<Button variant='second'><a href={"/auth/azure"}>OpenID Connect</a></Button>*/}
                    </CardBody>

                    {/*<CardFooter>*/}
                    {/*    {tabType === 'signup' && status === null && <TextWithLink text="Уже есть аккаунт?" linktext="Авторизация" onClick={() => {*/}
                    {/*        setTabType('signin');*/}
                    {/*        setError('')*/}
                    {/*    }} />}*/}
                    {/*    {tabType === 'signin' && status === null && <>*/}
                    {/*        <TextWithLink text="Нет аккаунта?" linktext="Регистрация" onClick={() => {*/}
                    {/*            setTabType('signup');*/}
                    {/*            setError('')*/}
                    {/*        }} />*/}
                    {/*        /!*<br/>*!/*/}
                    {/*        /!*<TextWithLink linktext="Забыли пароль?" onClick={e => navigate('/authn/send-reset')} />*!/*/}
                    {/*    </>}*/}
                    {/*</CardFooter>*/}
                </Card>
            </Block>

        </Box>);
    }

}

export default Authentication

/*
▄───▄
█▀█▀█
█▄█▄█
─███──▄▄
─████▐█─█
─████───█
─▀▀▀▀▀▀▀
*/
