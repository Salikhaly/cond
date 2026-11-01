import React,{useEffect,useState} from 'react';
import {api,moneyFmt} from './api';
import {Table} from './Fields';
import Icon from './Icon';

export default function HistoryWorkbook({onNavigate}){
 const [result,setResult]=useState(null),[dashboard,setDashboard]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;Promise.all([api('/native-import'),api('/dashboard').catch(()=>null)]).then(([r,d])=>{if(!active)return;setResult(r);setDashboard(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 if(error)return <section className="op-card"><p role="alert" className="op-missing">{error}</p></section>;
 if(!result)return <section className="op-card" role="status">Загружаем данные февраля…</section>;
 const c=result.counts;
 const norm=value=>String(value||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,'');
 const aliases=key=>key==='кольцосорехом'?'колечкосорехом':key;
 const seen=new Set();
 const priced=(dashboard?.products||[]).filter(p=>p.salePrice!=null&&String(p.description||'').includes('февраль 2025')).sort((a,b)=>a.name.localeCompare(b.name,'ru')).filter(p=>{const key=aliases(norm(p.name));if(seen.has(key))return false;seen.add(key);return true;});
 return <>
  <section className="op-card"><span className="op-eyebrow">ДАННЫЕ В БАЗЕ</span><h2>Февраль 2025</h2><p className="op-muted">Продажи, закупки и зарплата уже в обычных разделах.</p><div className="op-costs"><span>Продажи <b>{moneyFmt(result.totals.sales)} ₸</b></span><span>Выплаты по файлу <b>{moneyFmt(result.totals.expenses)} ₸</b></span></div></section>
  <div className="cond-import-grid">{[['shops','Клиенты и долги',c.customers+' клиентов · '+c.orders+' поставок',{kind:'client-debts'}],['expenses','Расходы',c.expenses+' записей',{kind:'expense-period',from:'2025-02-01',to:'2025-02-28'}],['materials','Закупки',c.receipts+' приходов',{kind:'history'}],['production','Выработка',c.productions+' акта',{kind:'historical-production'}],['payroll','Зарплата',c.workers+' сотрудников · '+c.payments+' выплаты',{kind:'payroll-month',month:'2025-02'}],['catalog','Товары',c.products+' позиций']].map(([id,label,hint,intent])=><button key={id} className="op-card cond-import-link" onClick={()=>onNavigate(id,intent)}><span className="suite-icon tone-shop"><Icon name={id}/></span><span><b>{label}</b><small>{hint}</small></span><span>→</span></button>)}</div>
  <section className="op-card"><div className="op-section-heading"><div><h3>Цены из Excel</h3><small className="op-muted">Найдено {priced.length} товаров с ценой в продажах</small></div></div>{priced.length?<Table mobileCards headers={['Товар','Цена, ₸']}>{priced.map(p=><tr key={p.id}><td>{p.name}</td><td><b>{moneyFmt(p.salePrice)}</b></td></tr>)}</Table>:<p className="op-muted">Цены в файле не найдены.</p>}<p className="op-muted">Цены взяты из строк продаж за февраль 2025 и записаны в карточки товаров. Состав в Excel не указан — рецептуры не выдумывались.</p></section>
  <section className="op-card"><h3>Что уточнить</h3><p>Откройте февраль 2025 в фильтре нужного раздела.</p><p className="op-plan-context">Остатки склада и счетов требуют сверки. Старые закупки не добавлены к сегодняшнему складу. Неизвестные статьи расходов ждут распределения.</p>{result.reviews.map((r,i)=><p className="op-missing" key={i}>{r.name}: расхождение {moneyFmt(Math.abs(r.difference))} ₸. Начисления взяты из индивидуальных листов.</p>)}<details className="op-help"><summary>Проверены все 18 листов</summary>{result.sheets.map(s=><p key={s.name}><b>{s.name}</b> · {s.handled}</p>)}<p className="op-muted">Сводки не создают повторные операции. Исходный файл сохранён для проверки.</p></details></section>
 </>;
}
