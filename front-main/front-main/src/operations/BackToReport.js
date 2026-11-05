import React from 'react';
export default function BackToReport({action,onNavigate}){
 if(action?.returnTo&&onNavigate)return <button type="button" className="ghost" onClick={()=>onNavigate(action.returnTo.section,action.returnTo.action)}>← {action.returnTo.label||'К задаче'}</button>;
 if(!action?.returnReport||!onNavigate)return null;
 return <button type="button" className="ghost" onClick={()=>onNavigate('finance',action.returnReport)}>← К отчёту</button>;
}
