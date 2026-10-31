import React, {useContext, useEffect, useMemo, useState} from 'react';


import {useAppContext} from "../../../app/provider/AppContextProvider";
import {Block, Button, GroupInput, Input, Link, Overlay, Typography} from "../../../shared/ui";
import Logger from "../../../shared/internal/Logger";
import {Loading} from "../../../widgets/Loading";

/**
 * SignIn должен работать также, как и OAuth Azure Ad перенаправлять на link и redirect-ить на /?authenticated=Boolean,
 * SignUp не должен перенаправлять, а только возвращать json о том, получилось ли создать нового пользователя или нет.
 * */
const SendActivationMail = ({ }) => {

    const logger = useMemo(()=>new Logger('SendActivationMail'), []);

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('')

    const { authHandler } = useAppContext()
    const {status, setStatus, isLoading, user, error, setError, registration, checkCode, authState, setAuthState} = authHandler;
    const [message, setMessage] = useState('');

    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isTryLink, setIsTryLink] = useState(false);

    useEffect(() => {
        if (error !== '') {
            startTimer(20)
            setIsTryLink(true)
        }
    }, []);
    useEffect(() => {
        let timer;

        if (isRunning) {
            timer = setInterval(() => {
                if (seconds > 0) {
                    setSeconds(seconds - 1);
                    // console.log(seconds)
                }
            }, 1000);
        } else {
            clearInterval(timer);
        }

        return () => clearInterval(timer);
    }, [seconds, isRunning]);

    function startTimer (seconds) {
        setSeconds(seconds)
        setIsRunning(true);
    };


    function registrationA(e) {
        e.preventDefault();
        setMessage('')
        setError('')

        const numericRegex = /^[0-9]+$/;
        const isNumericValid = numericRegex.test(code);
        if (code === '') {
            return setMessage('Введите код активации, отправленный на почту')
        } else if (!isNumericValid) {
            return setMessage('Код должен состоять из цифр')
        } else if (code.length > 6) {
            return setMessage('Код должен состоять из 6ти цифр')
        }
        checkCode(authState.email,code);
        // if (user) {
        //     return
        // }
    }

    function sendCode(e) {
        e.preventDefault();
        setMessage('')
        setError('')

        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        const isEmailValid = emailRegex.test(email);
        if (email === '') {
            return setMessage('Введите email')
        } else if (!isEmailValid) {
            return setMessage('Введите валидный email')
        }

        setAuthState({
            ...authState,
            email,
        });
        const res = registration(email);

        if (res.status) {
            setStatus(res.status);
        }
    }

    function sentTry() {
        console.log(authState.email)
        if (authState.email) {
            const res = registration(email);
            setIsTryLink(false)
        }
    }

    return (<>
        {isLoading && <Overlay><Loading /></Overlay>}
        {error && <p>{error} <br/><br/> </p>}
        {message && <p>{message} <br/><br/> </p>}

        <Typography bottom={20} size={18} weight={500} text={'Получить код активации на почту:'} />

        <form onSubmit={status ? registrationA : sendCode}>
            {!status && <>
                <div>
                    {/*<label>Email</label>*/}
                    <Input
                        type="text"
                        name="email"
                        value={email}
                        placeholder='Введите email'
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <Button type={'submit'}>Продолжить</Button>
            </>}

            {status && <>
                <GroupInput>
                    <label>Verification code</label>
                    <Input
                        type="number"
                        name="verificationCode"
                        value={code}
                        placeholder='Введите код из почты'
                        onChange={e => setCode(e.target.value)}
                        required
                    />
                </GroupInput>

                <Block isInline={true} justifyContent={'space-between'}>
                    <Button onClick={() => {setStatus(null)}} variant={'cancel'}>Отменить</Button>
                    {seconds < 1 && <Block isAlignCenter={true}>
                        <Button type={'submit'}>Продолжить</Button>
                    </Block>
                    }
                </Block>
                {isTryLink && <Block isAlignCenter={true}>
                    <Link onClick={sentTry} text={'Отправить код повторно'} />
                </Block>
                }
                <br/>
            </>}
        </form>
    </>);
}
export default SendActivationMail