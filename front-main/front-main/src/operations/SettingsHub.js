import React,{useState} from 'react';
import Icon from './Icon';
const items=[['authority','Администраторы','Полномочия и доступ владельца','directory'],['password','Мой пароль','Смена пароля аккаунта','users'],['telegram','Telegram','Уведомления и напоминания','phone'],['audit','Проверить учёт','Склад, деньги и зарплаты','check'],['staff','Добавить сотрудника','Регистрация и приглашение','plus'],['users','Пользователи','Доступ и задания на выпуск','users'],['roles','Права по ролям','Кто что видит','directory'],['history','История действий','Кто и что изменил','orders'],['exchange','Обмен с 1С','Подготовка выгрузки','transfer'],['install','На телефон','Установка приложения','phone']];
export default function SettingsHub({children}){
 const [selected,setSelected]=useState(null),panels=React.Children.toArray(children);
 const panel=id=>panels.find(p=>String(p.key).endsWith('$'+id));
 return selected===null?<div className="suite-settings-grid">{items.filter(([id])=>panel(id)).map(([id,title,hint,icon],i)=><button key={id} className="suite-setting" onClick={()=>setSelected(id)}><span className={'suite-icon tone-'+i%5}><Icon name={icon}/></span><span><b>{title}</b><small>{hint}</small></span><Icon name="forward" size={16}/></button>)}</div>:<><button className="ghost suite-back" onClick={()=>setSelected(null)}>← Все настройки</button>{selected==='users'&&panel('edit')}{panel(selected)}</>;
}
