import {useState} from 'react';
export function operationId(){return crypto.randomUUID?.()||'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));}
export default function usePendingAction(name){
    const key='cond.pending-action.v1:'+localStorage.getItem('cond-owner')+':'+name;
    const [value,setValue]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))||null;}catch{return null;}});
    const [stored,setStored]=useState(true);
    const update=next=>{let saved=true;try{if(next===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(next));setStored(true);}catch{saved=false;setStored(false);}setValue(next);return saved;};
    return [value,update,stored];
}
