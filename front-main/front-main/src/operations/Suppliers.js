import React,{useState} from 'react';
import TradeLedger from './TradeLedger';
import {purchaseComparisons} from './purchaseComparisons';
import {Field,Table,Empty} from './Fields';
import {moneyFmt} from './api';
export default function Suppliers({data,run,busy,initialAction}){
    const [view,setView]=useState('balances'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[search,setSearch]=useState('');
    const rows=purchaseComparisons(data.receipts||[],[...(data.materials||[]),...(data.archivedMaterials||[])],from,to).filter(r=>r.name.toLowerCase().includes(search.trim().toLowerCase()));
    return <><section className="op-card"><nav className="op-report-tabs op-finance-tabs" aria-label="Поставщики"><button className={view==='balances'?'active':''} aria-pressed={view==='balances'} onClick={()=>setView('balances')}>Закупки и оплаты</button><button className={view==='prices'?'active':''} aria-pressed={view==='prices'} onClick={()=>setView('prices')}>Сравнение цен</button></nav></section>
    {view==='balances'?<TradeLedger supplier initialAction={initialAction} data={data} run={run} busy={busy}/>:<><section className="op-card"><h2>У кого выгоднее закупать</h2><p className="op-muted">Сравнение фактических закупок в одной единице: кг, л или шт. Минимум и максимум — среди последних цен поставщиков; средневзвешенная — по всем закупкам выбранного периода.</p><div className="op-form-grid"><Field label="С даты" type="date" max={to||undefined} value={from} onChange={e=>setFrom(e.target.value)}/><Field label="По дату" type="date" min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/><Field label="Найти материал" type="search" value={search} onChange={e=>setSearch(e.target.value)}/></div></section>
    {!rows.length&&<Empty>За выбранный период закупок нет.</Empty>}{rows.map(r=><section className="op-card" key={r.materialId}><h2>{r.name}</h2><div className="op-costs"><span>Минимальная цена <b>{moneyFmt(r.min)} ₸/{r.unit}</b></span><span>Максимальная <b>{moneyFmt(r.max)} ₸/{r.unit}</b></span><strong>Средневзвешенная <b>{moneyFmt(r.weighted)} ₸/{r.unit}</b></strong></div><Table mobileCards headers={['Поставщик','Последняя цена','Дата закупки','Предыдущая цена','Изменение']}>{r.quotes.map(q=><tr key={q.supplier}><td>{q.supplier}</td><td><b>{moneyFmt(q.price)} ₸/{r.unit}</b></td><td>{q.date}</td><td>{q.previous===null?'—':moneyFmt(q.previous)+' ₸'}</td><td>{q.change===null?'Нет предыдущей цены':(q.change>0?'+':'')+q.change.toLocaleString('ru-RU',{maximumFractionDigits:1})+'%'}</td></tr>)}</Table></section>)}</>}
    </>;
}
