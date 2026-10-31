import React, {useState} from 'react';

/**
 * state в localStorage
 * Нужно для сохранения состояния при перезагрузке страницы.
 * */
export default function useStorage({ key }){
    function setState(state){
        localStorage.setItem(key, JSON.stringify(state));
    }
    function getState(){
        const item = localStorage.getItem(key);
        return JSON.parse(item);
    }
    function clearState(){
        localStorage.removeItem(key);
    }

    return {
        // state,
        setState,
        getState,
        clearState,
    }
}