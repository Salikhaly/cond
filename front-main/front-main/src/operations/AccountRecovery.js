import React,{useEffect,useState} from 'react';
import {api} from './api';
import {Field} from './Fields';
export default function AccountRecovery({onReturn}){
 const [link]=useState(()=>new URLSearchParams(window.location.hash.slice(1))),[open,setOpen]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).has('account-token'));
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false);
 const token=link.get('account-token'),invite=link.get('action')==='invite';
 const [mail,setMail]=useState(null);
 useEffect(()=>{if(open&&!token)api('/account/status').then(setMail).catch(()=>setMail(null));},[open,token]);
 if(!open)return <button type="button" className="ghost" onClick={()=>setOpen(true)}>Забыли пароль?</button>;
 return <section className="op-card"><h2>{token?(invite?'Регистрация сотрудника':'Новый пароль'):'Восстановить доступ'}</h2>{!done&&<form onSubmit={async e=>{e.preventDefault();setError('');if(token&&password!==confirm){setError('Пароли не совпадают');return;}setBusy(true);try{const result=await api(token?'/account/complete':'/account/reset',token?{token,password}:{email});setMessage(result.message);setDone(true);if(token)window.history.replaceState(null,'',window.location.pathname+window.location.search);}catch(e){setError(e.message);}finally{setBusy(false);}}}>
 {token?<><Field label="Новый пароль" type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/><Field label="Повторите пароль" type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>:mail?.configured===false?<p className="op-plan-context">Отправка писем пока не подключена. Для смены пароля обратитесь к администратору.</p>:<Field label="Email аккаунта" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}
 {(token||mail?.configured!==false)&&<button disabled={busy}>{busy?'Отправляем…':token?'Сохранить пароль':'Отправить ссылку'}</button>}</form>}{error&&<p className="op-alert error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button type="button" className="ghost" disabled={busy} onClick={()=>{setOpen(false);setDone(false);setMessage('');setError('');if(token)window.history.replaceState(null,'',window.location.pathname+window.location.search);onReturn?.();}}>Вернуться в COND</button></section>;
}
