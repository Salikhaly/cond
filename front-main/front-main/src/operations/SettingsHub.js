import React,{useState} from 'react';
import Icon from './Icon';
const items=[['Сервер и синхронизация','Основная база и работа без связи','transfer'],['Telegram','Уведомления и напоминания','phone'],['Проверить учёт','Сверка склада, денег и зарплат','check'],['Добавить сотрудника','Карточка и вход в приложение','plus'],['Пользователи','Открыть или закрыть доступ','users'],['Права по ролям','Кто что видит и может делать','directory'],['История действий','Кто и что изменил','orders'],['Обмен с 1С','Подготовка выгрузки данных','transfer'],['На телефон','Установка и работа без интернета','phone'],['Старый интерфейс','Прежние отчёты и документы','box']];
export default function SettingsHub({children}){
 const [selected,setSelected]=useState(null),panels=React.Children.toArray(children);
 return selected===null?<div className="suite-settings-grid">{items.map(([title,hint,icon],i)=><button key={title} className="suite-setting" onClick={()=>setSelected(i)}><span className={'suite-icon tone-'+i%5}><Icon name={icon}/></span><span><b>{title}</b><small>{hint}</small></span><Icon name="forward" size={16}/></button>)}</div>:<><button className="ghost suite-back" onClick={()=>setSelected(null)}>← Все настройки</button>{panels[selected]}</>;
}
