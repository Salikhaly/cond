import React,{useState} from 'react';
import TradeLedger from './TradeLedger';
import {purchaseComparisons,supplierAnalysis} from './purchaseComparisons';
import {Field,Table,Empty} from './Fields';
import {moneyFmt} from './api';

export default function Suppliers({data,run,busy,initialAction}){
    const [view,setView]=useState('balances'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[search,setSearch]=useState(''),[focus,setFocus]=useState('');
    const all=purchaseComparisons(data.receipts||[],[...(data.materials||[]),...(data.archivedMaterials||[])],from,to);
    const analysis=supplierAnalysis(all,data.receipts||[],from,to);
    const selected=analysis.find(item=>item.supplier===focus);
    const rows=all.filter(r=>r.name.toLowerCase().includes(search.trim().toLowerCase())&&(!focus||r.quotes.some(q=>q.supplier===focus)));
    return <>
        <section className="op-card"><nav className="op-report-tabs op-finance-tabs" aria-label="Поставщики"><button className={view==='balances'?'active':''} aria-pressed={view==='balances'} onClick={()=>setView('balances')}>Закупки и оплаты</button><button className={view==='prices'?'active':''} aria-pressed={view==='prices'} onClick={()=>setView('prices')}>Анализ цен</button></nav></section>
        {view==='balances'?<TradeLedger supplier initialAction={initialAction} data={data} run={run} busy={busy}/>:<>
            <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">СРАВНЕНИЕ ПОСТАВЩИКОВ</span><h2>У кого выгоднее</h2><p className="op-muted">Цена приведена к одной единице: за кг, литр или штуку. Фасовка 240 или 360 штук не мешает сравнению.</p></div></div>
                <div className="op-form-grid"><Field label="С даты" type="date" max={to||undefined} value={from} onChange={e=>setFrom(e.target.value)}/><Field label="По дату" type="date" min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/><Field label="Поставщик"><select value={focus} onChange={e=>setFocus(e.target.value)}><option value="">Все поставщики</option>{analysis.map(item=><option key={item.supplier} value={item.supplier}>{item.supplier}</option>)}</select></Field><Field label="Найти материал" type="search" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                {selected&&<div className="op-supplier-focus"><div><span>Поставщик</span><b>{selected.supplier}</b></div><div><span>Материалов</span><b>{selected.materials}</b></div><div><span>Лучших цен</span><b>{selected.bestCount}</b></div><div className={selected.overpay>0?'over':''}><span>{selected.overpay>0?'Переплата к лучшей цене':'Без переплаты'}</span><b>{moneyFmt(selected.overpay)} ₸</b></div></div>}
            </section>
            {!rows.length?<Empty>За выбранный период закупок нет. Добавьте приход с поставщиком и фасовкой.</Empty>:rows.map(r=><section className="op-card" key={r.materialId}><div className="op-section-heading"><div><h2>{r.name}</h2><p className="op-muted">Единица сравнения: 1 {r.unit} · лучший — {r.bestSupplier}</p></div><span className="op-badge posted">{moneyFmt(r.min)} ₸/{r.unit}</span></div>
                <div className="op-costs"><span>Лучшая цена <b>{moneyFmt(r.min)} ₸/{r.unit}</b></span><span>Максимальная <b>{moneyFmt(r.max)} ₸/{r.unit}</b></span><strong>Средневзвешенная <b>{moneyFmt(r.weighted)} ₸/{r.unit}</b></strong></div>
                {r.packSizes.length>0?<p className="op-field-hint">Встречаются фасовки: {r.packSizes.map(size=>size.toLocaleString('ru-RU')+' '+r.unit).join(' · ')}. Сравнение идёт по цене за единицу, а не за упаковку.</p>:<p className="op-field-hint">Фасовка в приходах не указана. Добавьте «штук в коробке» при приходе — тогда будет видно 240 против 360.</p>}
                <Table mobileCards headers={['Поставщик','Фасовка','Цена упаковки','Цена за '+r.unit,'Разница']}>{r.quotes.map(q=><tr key={q.supplier} className={(q.isBest?'op-price-best ':'')+(q.supplier===focus?'op-price-focus':'')}><td>{q.supplier}</td><td>{q.packLabel}{q.packSize?<small className="op-cell-detail">{q.orders===1?'1 приход':q.orders+' приходов'}</small>:null}</td><td>{q.packPrice==null?'—':moneyFmt(q.packPrice)+' ₸'}</td><td><b>{moneyFmt(q.price)} ₸</b></td><td>{q.isBest?'Лучшая':<><b className="op-margin-alert">+{moneyFmt(q.diff)} ₸</b><small className="op-cell-detail">+{q.diffPercent.toLocaleString('ru-RU',{maximumFractionDigits:1})}%</small></>}</td></tr>)}</Table>
                <p className="op-muted">Последняя цена у {r.bestSupplier}: {moneyFmt(r.best.price)} ₸/{r.unit}.{r.quotes.length===1?' Пока только один поставщик — добавьте второй приход для сравнения.':''}</p>
            </section>)}
            {analysis.length>0&&<section className="op-card"><div className="op-section-heading"><div><h2>Сводка по поставщикам</h2><p className="op-muted">Переплата считается по фактически купленному количеству к лучшей цене на тот же материал.</p></div></div><Table mobileCards headers={['Поставщик','Материалов','Лучших цен','Переплата']}>{analysis.map(item=><tr key={item.supplier}><td><button className="ghost" onClick={()=>setFocus(item.supplier)}>{item.supplier}</button></td><td>{item.materials}</td><td>{item.bestCount}</td><td className={item.overpay>0?'op-margin-alert':''}>{moneyFmt(item.overpay)} ₸</td></tr>)}</Table></section>}
        </>}
    </>;
}
