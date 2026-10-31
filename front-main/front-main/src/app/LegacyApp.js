import React from "react";
// import useTheme from "../shared/libs/hooks/useTheme";
import {AppContextProvider} from "./provider/AppContextProvider";
import AppContainer from "../pages/AppContainer";
import Router from "./router/Router";

import './styles/styles.css';

export default function App() {


    // const {theme, setTheme} = useTheme();

    return (<>
        <AppContextProvider>
            <AppContainer>
                <Router />
            </AppContainer>
        </AppContextProvider>
    </>)
}

