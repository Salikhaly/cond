import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from "react-router-dom";

import App from "./app/App";

console.log("process.env.API_URL:", process.env.API_URL_DEV);

// Таким же способом можно динамически менять иконку сайта



const root = ReactDOM.createRoot(document.getElementById("root"));
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(() => {});
    if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys
            .filter(key => key.startsWith('cond-shell-') && !key.startsWith('cond-shell-v2-'))
            .map(key => caches.delete(key))))
            .catch(() => {});
    }
}

root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);

/*
▄───▄
█▀█▀█
█▄█▄█
─███──▄▄
─████▐█─█
─████───█
─▀▀▀▀▀▀▀
*/

