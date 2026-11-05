import React, { useState,useEffect } from 'react';
import { api } from './api';
import Icon from './Icon';
import { Field, Empty } from './Fields';
import TradeLedger from './TradeLedger';
import ClientPrices from './ClientPrices';
import StoreLinkSettings from './StoreLinkSettings';
import './clients.css';
const fresh = {
  customerId: '',
  customerName: '',
  debtScope: 'company',
  name: '',
  address: '',
  contact: '',
  phone: '',
  representativeId: ''
};
export default function Customers({
  data,
  user,
  run,
  busy,
  onOrder,initialAction
}) {
  const admin = user.role === 'super_admin',
    [screen,setScreen]=useState(['client-debts','receive-payment'].includes(initialAction?.kind)?'money':'shops'),
    [search, setSearch] = useState(''),
    [adding, setAdding] = useState(false),[linkOutlet,setLinkOutlet]=useState(null),
    [form, setForm] = useState(fresh),
    [clientKey, setClientKey] = useState(initialAction?.partyKey||''),
    [editingShop, setEditingShop] = useState(null),
    [shopForm, setShopForm] = useState({ customerName: '', debtScope: 'company', name: '', address: '', contact: '', phone: '', representativeId: '' });
  useEffect(()=>{if(['client-debts','receive-payment'].includes(initialAction?.kind))setScreen('money');if(initialAction?.kind==='prices')setScreen('prices');if(initialAction?.partyKey)setClientKey(initialAction.partyKey);if(initialAction?.kind==='outlet'){setSearch(initialAction.query||'');setScreen('shops');}},[initialAction]);
  const change = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const outlets = (data.outlets || []).filter(o => [o.name, o.address, (data.customers || []).find(c => c.id === o.customerId)?.name].join(' ').toLowerCase().includes(search.toLowerCase()));
  const reps = (data.users || []).filter(u => u.role === 'representative' && !u.disabled);
  const clientOptions=(data.customers||[]).flatMap(customer=>customer.debtScope==='outlet'
    ?(data.outlets||[]).filter(outlet=>outlet.customerId===customer.id).map(outlet=>({key:'outlet:'+outlet.id,label:customer.name+' · '+outlet.name}))
    :[{key:'customer:'+customer.id,label:customer.name}]);
  const navigation=admin&&<section className="op-card"><nav className="op-report-tabs op-finance-tabs" aria-label="Клиенты">{[['shops','Магазины'],['money','Оплаты и долги'],['prices','Индивидуальные цены']].filter(([id])=>id!=='money'||data.permissions?.finance!==false).map(([id,label])=><button key={id} className={screen===id?'active':''} aria-pressed={screen===id} onClick={()=>setScreen(id)}>{label}</button>)}</nav>{admin&&<div className="op-client-quick"><Field label="Быстрый выбор клиента"><select value={clientKey} onChange={e=>setClientKey(e.target.value)}><option value="">Выберите клиента</option>{clientOptions.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></Field><button disabled={!clientKey} onClick={()=>setScreen('money')}>Расчёты / удержание</button></div>}</section>;
  if(linkOutlet)return <StoreLinkSettings outlet={linkOutlet} run={run} busy={busy} onBack={()=>setLinkOutlet(null)}/>;
  if(admin&&screen==='money')return <>{navigation}<TradeLedger data={data} run={run} busy={busy} initialPartyKey={clientKey}/></>;
  if(admin&&screen==='prices')return <>{navigation}<ClientPrices data={data} run={run} busy={busy}/></>;
  return <>{navigation}{admin && editingShop && <section className="op-card"><h2>Изменить клиента и магазин</h2><form onSubmit={e => { e.preventDefault(); run(async () => { await api('/customers/' + editingShop.customerId, { name: shopForm.customerName, debtScope: shopForm.debtScope }, 'PATCH'); await api('/outlets/' + editingShop.id + '/details', { name: shopForm.name, address: shopForm.address, contact: shopForm.contact, phone: shopForm.phone, representativeId: Number(shopForm.representativeId) }, 'PATCH'); setEditingShop(null); }, 'Клиент и магазин изменены'); }}><div className="op-form-grid"><Field label="Клиент / фирма" required maxLength={250} value={shopForm.customerName} onChange={e => setShopForm(f => ({ ...f, customerName: e.target.value }))} /><Field label="Порядок расчётов"><select value={shopForm.debtScope} onChange={e => setShopForm(f => ({ ...f, debtScope: e.target.value }))}><option value="company">Один общий счёт фирмы</option><option value="outlet">Отдельно по магазинам</option></select></Field></div><div className="op-form-grid"><Field label="Название магазина" required maxLength={250} value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} /><Field label="Адрес магазина" required maxLength={250} value={shopForm.address} onChange={e => setShopForm(f => ({ ...f, address: e.target.value }))} /><Field label="Контактное лицо" maxLength={250} value={shopForm.contact} onChange={e => setShopForm(f => ({ ...f, contact: e.target.value }))} /><Field label="Телефон" type="tel" maxLength={40} value={shopForm.phone} onChange={e => setShopForm(f => ({ ...f, phone: e.target.value }))} /><Field label="Торговый представитель"><select required value={shopForm.representativeId} onChange={e => setShopForm(f => ({ ...f, representativeId: e.target.value }))}><option value="">Выберите сотрудника</option>{reps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field></div><div className="op-actions"><button disabled={busy}>Сохранить</button><button type="button" className="secondary" onClick={() => setEditingShop(null)}>Отмена</button></div></form></section>}<section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">{admin ? 'КЛИЕНТЫ И ТОРГОВЫЕ ТОЧКИ' : 'МОЙ МАРШРУТ'}</span><h2>{admin ? 'Магазины' : 'Мои магазины'}</h2></div>{admin && <button onClick={() => setAdding(v => !v)}>{adding ? 'Закрыть форму' : '+ Добавить магазин'}</button>}</div><Field label="Найти магазин или адрес" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Название, фирма, улица" /></section>
{adding && admin && <section className="op-card"><h2>Новый магазин</h2><form onSubmit={e => {
        e.preventDefault();
        run(async () => {
          await api('/outlets', form);
          setForm(fresh);
          setAdding(false);
        }, 'Магазин добавлен и закреплён за представителем');
      }}><Field label="Клиент / фирма"><select value={form.customerId} onChange={e => change('customerId', e.target.value)}><option value="">+ Новый клиент</option>{(data.customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>{!form.customerId && <div className="op-form-grid"><Field label="Название клиента / фирмы" required value={form.customerName} onChange={e => change('customerName', e.target.value)} /><Field label="Порядок будущих расчётов"><select value={form.debtScope} onChange={e => change('debtScope', e.target.value)}><option value="company">Один общий счёт фирмы</option><option value="outlet">Отдельно по магазинам</option></select></Field></div>}<div className="op-form-grid"><Field label="Название магазина" required value={form.name} onChange={e => change('name', e.target.value)} /><Field label="Адрес магазина" required value={form.address} onChange={e => change('address', e.target.value)} /><Field label="Контактное лицо" value={form.contact} onChange={e => change('contact', e.target.value)} /><Field label="Телефон" type="tel" value={form.phone} onChange={e => change('phone', e.target.value)} /><Field label="Торговый представитель"><select required value={form.representativeId} onChange={e => change('representativeId', e.target.value)}><option value="">Выберите сотрудника</option>{reps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field></div><p className="op-muted">Расчёты доступны во вкладке «Оплаты и долги». Порядок расчётов определяет общий счёт фирмы или отдельные счета магазинов.</p><button disabled={busy || !reps.length}>Сохранить магазин</button>{!reps.length && <p className="op-missing">Сначала создайте доступ торговому представителю в настройках.</p>}</form></section>}
<div className="op-shop-grid">{outlets.map(o => {
        const c = (data.customers || []).find(c => c.id === o.customerId);
        return <article key={o.id} className="op-card op-shop suite-shop"><span className="suite-icon tone-shop"><Icon name="shops"/></span><span className="op-eyebrow">{c?.name}</span><h2>{o.name}</h2><p>{o.address}</p>{o.contact && <p className="op-muted">{o.contact}{o.phone ? ' · ' + o.phone : ''}</p>}{!o.contact && o.phone && <p>{o.phone}</p>}<div className="suite-shop-actions"><button onClick={()=>onOrder(o.id)}><Icon name="orders" size={17}/>Собрать заказ</button>{o.phone&&<a className="suite-call" href={"tel:"+o.phone.replace(/[^+0-9]/g,'')} aria-label={"Позвонить: "+o.name}><Icon name="phone" size={19}/></a>}{admin&&<button className="secondary" onClick={()=>{setEditingShop(o);setShopForm({customerName:c?.name||'',debtScope:c?.debtScope||'company',name:o.name,address:o.address,contact:o.contact||'',phone:o.phone||'',representativeId:o.representativeId||''});}}>Изменить</button>}{(data.isOwner||user.authority?.owner)&&<button className="secondary" onClick={()=>setLinkOutlet(o)}>Каталог магазина</button>}</div>{admin ? <details className="op-help"><summary>Представитель</summary><Field label="Закреплён за"><select disabled={busy} value={o.representativeId} onChange={e => run(() => api('/outlets/' + o.id, {
              representativeId: Number(e.target.value)
            }, 'PATCH'), 'Представитель изменён')}>{(data.users || []).filter(u => u.role === 'representative').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field></details> : null}<small className="op-muted">{c?.debtScope === 'outlet' ? 'Учёт по точкам' : 'Общий клиент фирмы'}</small></article>;
      })}</div>{!outlets.length && <Empty>{admin ? 'Добавьте первый магазин и назначьте представителя.' : 'Магазинов пока нет. Попросите администратора закрепить за вами торговые точки.'}</Empty>}</>;
}
