import React from 'react';
import {fmt} from './api';
const names={name:'Название',weight:'Вес упаковки',quantity:'Количество',kg:'Вес на складе',reservedKg:'В резерве',unitCost:'Цена единицы',priceForEmployee:'Ставка работника за кг',status:'Статус',active:'Действует',is_active:'Действует',contact:'Контакт',phone:'Телефон',comment:'Комментарий',note:'Комментарий',date:'Дата операции',dueDate:'Срок оплаты',lines:'Позиции',payload:'Данные черновика',amount:'Сумма',total:'Сумма документа',overhead:'Прочие затраты',outputKg:'Выход по калькуляции',version:'Версия',address:'Адрес',disabled:'Доступ закрыт',totalCost:'Себестоимость',laborCost:'Начисление работнику',display:'Фото и описание'};
const statuses={draft:'Черновик',posted:'Проведено',submitted:'Новая заявка',approved:'Согласовано',shipped:'Отгружено',cancelled:'Отменено',rejected:'Отклонено'};
function value(v,key,data){
 if(v==null)return '—';if(typeof v==='boolean')return v?'Да':'Нет';if(key==='status')return statuses[v]||v;
 if(Array.isArray(v))return v.map(l=>{if(!l||typeof l!=='object')return String(l);const material=[...(data.materials||[]),...(data.archivedMaterials||[])].find(m=>m.id===l.materialId);return (l.name||material?.name||'Позиция')+' · '+fmt(l.quantity??l.kg??l.actualQty??0)+(material?' '+material.unit:' кг')+(l.price!=null?' · '+fmt(l.price)+' ₸':'');}).join('; ');
 if(typeof v==='object'){if(key==='display')return (v.description||'Без описания')+' · фото сохранено';if(key==='payload')return [v.supplier,v.document,v.date,value(v.lines||[],'lines',data)].filter(Boolean).join(' · ');return 'Сохранены данные операции';}
 return String(v);
}
export default function AuditChanges({rows,data}){
 if(!rows?.length)return null;
 return <details className="op-audit-changes"><summary>Что изменилось</summary>{rows.map(r=>{const fields=[...new Set([...Object.keys(r.before||{}),...Object.keys(r.after||{})])].filter(k=>names[k]&&JSON.stringify(r.before?.[k])!==JSON.stringify(r.after?.[k]));return <div key={r.id}>{r.reason&&<p>{r.reason}</p>}{fields.map(key=><p key={key}><b>{names[key]}</b><br/>{value(r.before?.[key],key,data)} → {value(r.after?.[key],key,data)}</p>)}</div>;})}</details>;
}
