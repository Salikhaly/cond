import React from 'react';
export default function BackToReport({action,onNavigate}){
 if(!action?.returnReport||!onNavigate)return null;
 return <button className="ghost" onClick={()=>onNavigate('finance',action.returnReport)}>← К отчёту</button>;
}
