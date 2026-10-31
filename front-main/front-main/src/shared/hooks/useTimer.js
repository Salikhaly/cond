import React, {useEffect, useState} from "react";

export default function useTimer() {

    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let timer;

        if (isRunning) {
            timer = setInterval(() => {
                if (seconds === 0) {
                    setIsRunning(false)
                }
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



    function startTimer (timerSeconds) {
        setSeconds(timerSeconds)
        setIsRunning(true);
    }

    return ({
        seconds,
        isRunning,
        startTimer
    })
}