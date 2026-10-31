import React,{useState} from 'react';
import {api,today,moneyFmt} from './api';
import {Field,Table} from './Fields';
export default function ClientPrices({data,run,busy}){
    const [form,setForm]=useState({customerId:'',outletId:'',productId:'',price:'',startsOn:today()});
    const change=(k,v)=>setForm(f=>({...f,[k]:v,...(k==='customerId'?{outletId:''}:{})}));
    const history=(data.clientPrices||[]).filter(p=>!form.customerId||p.customerId===form.customerId);
    return <section className="op-card"><h2>Индивидуальные цены клиентов</h2><p className="op-muted">Цена магазина применяется первой, затем цена клиента, затем общий прайс. Новая цена не меняет прежние продажи.</p>
    <form onSubmit={e=>{e.preventDefault();run(async()=>{await api('/client-prices',form);setForm(f=>({...f,price:''}));},'Цена сохранена с выбранной даты');}}>
    <div className="op-form-grid"><Field label="Клиент"><select required value={form.customerId} onChange={e=>change('customerId',e.target.value)}><option value="">Выберите клиента</option>{(data.customers||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Магазин"><select value={form.outletId} onChange={e=>change('outletId',e.target.value)}><option value="">Все магазины клиента</option>{(data.outlets||[]).filter(o=>o.customerId===form.customerId).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <Field label="Товар"><select required value={form.productId} onChange={e=>change('productId',e.target.value)}><option value="">Выберите товар</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Цена за кг, ₸" required type="number" min="0" step="0.01" value={form.price} onChange={e=>change('price',e.target.value)}/><Field label="Действует с" type="date" required value={form.startsOn} onChange={e=>change('startsOn',e.target.value)}/></div><button disabled={busy}>Сохранить новую цену</button></form>
    {!!history.length&&<Table mobileCards headers={['Клиент','Магазин','Товар','Цена за кг','Действует с']}>{history.map(p=><tr key={p.id}><td>{data.customers.find(c=>c.id===p.customerId)?.name}</td><td>{data.outlets.find(o=>o.id===p.outletId)?.name||'Все'}</td><td>{data.products.find(x=>x.id===p.productId)?.name||'Товар в архиве'}</td><td>{moneyFmt(p.price)} ₸</td><td>{p.startsOn}</td></tr>)}</Table>}
    </section>;
}
