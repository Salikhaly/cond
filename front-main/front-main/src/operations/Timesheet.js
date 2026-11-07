import React,{useMemo,useState,useEffect} from 'react';
import {api,moneyFmt,today} from './api';
import {Field} from './Fields';
import {calendarMetrics} from './workCalendarMetrics';
import {attendance,pending,labels,statuses} from '../../../../back-main/back-main/src/domain/workAttendance';
import './timesheet.css';
const short={worked:'Я',off:'В',sick:'Б',vacation:'О',absent:'Н',reported:'?'};
const title=month=>new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
export default function Timesheet({data,person,month,user,run,busy,initialDate}){
 const m=useMemo(()=>calendarMetrics(data,person.id,month),[data,person.id,month]);
 const admin=user?.role==='super_admin'&&data.permissions?.payroll!==false,own=user?.id===person.id;
 const [editing,setEditing]=useState(null),[mark,setMark]=useState('worked'),[comment,setComment]=useState(''),[amount,setAmount]=useState('');
 const rows=m.days.map(d=>({...d,status:d.productions.length?'worked':pending(d.work)||d.work?._pending?'reported':attendance(d.work)||''}));
 const canOpen=d=>!busy&&d.date<=today()&&(admin||own&&d.date===today()&&(!d.work||pending(d.work)));
 const open=d=>{if(!canOpen(d))return;const kind=attendance(d.work)||'worked';setEditing(d);setMark(kind);setComment(d.work?.comment||'');setAmount(d.work?.dailyAmount??(kind==='worked'?d.policy?.shiftRate??'':0));};
 useEffect(()=>{const day=rows.find(d=>d.date===initialDate);if(day)open(day);},[initialDate]);
 const perDay=['shift','shift_piece'].includes(editing?.policy?.mode);
 const save=()=>{if(!editing)return;run(async()=>{await api('/work-days',{userId:person.id,date:editing.date,status:mark,comment,...(admin&&perDay?{dailyAmount:amount}:{})});setEditing(null);},admin?'Отметка и сумма сохранены':'Отметка отправлена администратору');};
 return <section className="op-card">
 <div className="op-section-heading"><div><span className="op-eyebrow">ТАБЕЛЬ</span><h2>{title(month)}</h2><p className="op-muted">{person.name}</p></div><span className="op-badge posted">{m.worked} раб. дней</span></div>
 <div className="op-timesheet-summary"><div><span>Работал</span><b>{m.worked}</b></div><div><span>Больничный</span><b>{rows.filter(d=>d.attendance==='sick'&&!d.pending).length}</b></div><div><span>Отпуск</span><b>{rows.filter(d=>d.attendance==='vacation'&&!d.pending).length}</b></div><div><span>Начислено</span><b>{moneyFmt(m.recorded)} ₸</b></div></div>
 <div className="op-timesheet-calendar">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=><div key={d} className="op-timesheet-weekday">{d}</div>)}{Array.from({length:m.offset},(_,i)=><div key={'empty'+i} className="op-timesheet-day empty"/>)}{rows.map(d=><button key={d.date} type="button" className={'op-timesheet-day '+(d.status||'unmarked')} disabled={!canOpen(d)} onClick={()=>open(d)} aria-label={d.date+' · '+(labels[d.status]||(d.status==='reported'?'На проверке':'Нет отметки'))+' · '+moneyFmt(d.earned)+' тенге'}><span className="op-timesheet-number">{d.number}</span>{d.status&&<b className="op-timesheet-letter">{short[d.status]}</b>}{d.earned!==0&&<small>{new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1}).format(d.earned)}</small>}</button>)}</div>
 <div className="op-timesheet-legend">{[...statuses,'reported'].map(s=><span key={s}><i className={'op-timesheet-dot '+s}/>{short[s]} · {labels[s]||'На проверке'}</span>)}</div>
 {editing&&<div className="op-review-panel"><h3>{editing.number} · {title(month)}</h3><Field label="Отметка дня"><select value={mark} onChange={e=>{setMark(e.target.value);setAmount(e.target.value==='worked'?editing.policy?.shiftRate??'':0);}}>{statuses.map(s=><option key={s} value={s} disabled={editing.productions.length>0&&s!=='worked'}>{labels[s]}</option>)}</select></Field>{admin&&perDay&&<Field label="Начислить за день, ₸" type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={mark==='worked'?String(editing.policy.shiftRate):'0'}/>}<Field label="Комментарий · необязательно" maxLength={250} value={comment} onChange={e=>setComment(e.target.value)}/>{!admin&&<p className="op-field-hint">Отметку и сумму подтвердит администратор.</p>}{admin&&!perDay&&<p className="op-field-hint">Отметка не меняет оплату за выпуск или месячный оклад. Для дневной суммы выберите «За день / смену» в условиях оплаты.</p>}{admin&&perDay&&mark==='sick'&&<p className="op-field-hint">Укажите сумму за больничный или оставьте 0.</p>}<div className="op-actions"><button disabled={busy} onClick={save}>{admin?'Сохранить':'Отправить отметку'}</button><button className="secondary" onClick={()=>setEditing(null)}>Отмена</button></div></div>}
 <p className="op-field-hint">Нажмите на день. Суммы показывают подтверждённые начисления.</p>
 </section>;
}
