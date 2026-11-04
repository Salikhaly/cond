import React, { useEffect, useRef, useState } from 'react';
import {restoreDraft} from './draftDefaults';

// Origin and user isolate drafts between databases and accounts.
export default function useDraft(name, initial) {
    const key = 'cond.draft.v1:' + localStorage.getItem('cond-owner') + ':' + name;
    const [value, setValue] = useState(() => {
        try { return restoreDraft(name,JSON.parse(localStorage.getItem(key)),initial); }
        catch { return initial; }
    });
    const [stored, setStored] = useState(true);
    const current=useRef(value);
    const update=change=>{
        const next=typeof change==='function'?change(current.current):change;
        current.current=next;
        // Persist before navigation can unmount the form, including a successful reset.
        try{localStorage.setItem(key,JSON.stringify(next));setStored(true);}catch{setStored(false);}
        setValue(next);
    };
    useEffect(() => {
        try { if(localStorage.getItem(key)===null)localStorage.setItem(key, JSON.stringify(current.current));setStored(true); }
        catch { setStored(false); }
    }, [key]);
    return [value, update, stored];
}

export function DraftNote({ stored }) {
    return <p className={stored ? 'op-draft-note' : 'op-missing'} role="status">{stored
        ? 'Черновик на этом устройстве · ещё не записано в учёт'
        : 'Не удалось сохранить черновик на устройстве. Не закрывайте форму.'}</p>;
}
