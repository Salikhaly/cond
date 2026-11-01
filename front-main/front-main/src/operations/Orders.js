import NumericInput from './SafeNumericInput';
import FormProgress from './FormProgress';
import ShopPicker from './ShopPicker';
import {numericError} from './numericValue';
import React, { useState, useEffect, useRef } from 'react';
import { api, fmt, moneyFmt, today } from './api';
import { Field, Badge, Empty, Table } from './Fields';
import ProductPhoto from './ProductPhoto';
import CartReviewLines from './CartReviewLines';
import {cartPricing} from './cartPricing';
import {customerPricing} from './customerPricing';
function OrderCard({
  order,
  admin,
  run,
  busy,
  onPrint,
  onReturn,
  products = []
}) {
  const [prices, setPrices] = useState(order.lines.map(l => l.price ?? ''));
  const [confirm, setConfirm] = useState(null);
  const displayPrices=order.lines.map((l,i)=>{const v=admin&&order.status==='submitted'?prices[i]:l.price;return v===''||v==null?null:Number(v);});
  const displayTotal=displayPrices.some(p=>p===null)?null:Math.round(order.lines.reduce((s,l,i)=>s+Math.round(l.kg*displayPrices[i]*100)/100,0)*100)/100;
  const missing = order.status === 'submitted' ? order.lines.map(l => ({
    ...l,
    missing: Math.max(0, Number(l.kg) - Number(products.find(p => p.id === l.productId)?.availableKg || 0))
  })).filter(l => l.missing > 0) : [];
  const submit = status => run(() => api('/orders/' + order.id, status === 'approved' ? {
    status,
    prices
  } : {
    status
  }, 'PATCH'), 'Изменения сохранены');
  return <article id={"op-order-"+order.id} className="op-order">
        <div className="op-section-heading"><div>{order._pending ? <span className="op-badge">На телефоне · ждёт отправки</span> : <Badge status={order.status} />}<h3>{order.destination?.outletName || order.company}</h3>{order.destination && <p className="op-muted">{order.destination.customerName} · {order.destination.address}</p>}<p className="op-muted">№ {order.id.slice(0, 8).toUpperCase()} · На {order.deliveryDate}</p></div><button className="secondary" disabled={order._pending} onClick={() => onPrint(order)}>{order.status === 'shipped' ? 'Накладная' : 'Посмотреть заявку'}</button></div>
        <details className="op-help suite-order-lines" open={admin&&order.status==='submitted'}><summary>Товары · {order.lines.length} поз. · {fmt(order.lines.filter(l=>l.unit!=='шт').reduce((sum,l)=>sum+Number(l.kg),0))} кг{order.lines.some(l=>l.unit==='шт')&&' · '+fmt(order.lines.filter(l=>l.unit==='шт').reduce((sum,l)=>sum+Number(l.kg),0))+' шт'}</summary><Table mobileCards headers={['Товар', 'Количество', 'Цена за единицу', 'Сумма']}>
            {order.lines.map((l, i) => <tr key={l.productId}><td>{l.name}</td><td>{fmt(l.kg)} {l.unit||'кг'}</td><td>{admin && order.status === 'submitted' ? <NumericInput aria-label={`Цена за кг: ${l.name}`} type="number" min="0" step="0.01" value={prices[i]} onChange={e => {
            const v = e.target.value;
            setPrices(p => p.map((x, j) => i === j ? v : x));
          }} /> : l.price == null ? 'Согласуется' : `${fmt(l.price)} ₸`}</td><td>{displayPrices[i]===null?'—':moneyFmt(Math.round(l.kg*displayPrices[i]*100)/100)+' ₸'}</td></tr>)}
        </Table></details>
        <p className="op-order-total">{order.status==='submitted'?'Предварительно: ':'Итого: '}{displayTotal===null?'Цена не указана':moneyFmt(displayTotal)+' ₸'}</p>
        {order.note && <p className="op-muted">Комментарий: {order.note}</p>}
        {admin && missing.length > 0 && <div className="op-missing"><b>Перед согласованием нужно изготовить</b>{missing.map(l => <span key={l.productId}>{l.name}: ещё {fmt(l.missing)} кг</span>)}</div>}
        <div className="op-actions">
            {order.status==='shipped'&&onReturn&&<button className="secondary" onClick={()=>onReturn(order.id)}>Возврат / Обмен</button>}
            {!order._pending && admin && order.status === 'submitted' && <button disabled={busy || missing.length > 0 || prices.some(p => p === '' || numericError(p,{min:0,step:'.01'}))} onClick={() => setConfirm('approved')}>Подтвердить заказ</button>}
            {!order._pending && admin && order.status === 'approved' && <button disabled={busy} onClick={() => setConfirm('shipped')}>Подтвердить отгрузку</button>}
            {!order._pending && ['submitted', 'approved'].includes(order.status) && <button className="ghost danger" disabled={busy} onClick={() => setConfirm('cancelled')}>Отменить заявку</button>}
        </div>
        {confirm && <div className="op-order-confirm"><b>{confirm === 'approved' ? 'Согласовать цены и занять товар в резерв?' : confirm === 'shipped' ? 'Товар передан магазину? Подтвердить списание?' : 'Отменить эту заявку?'}</b><p>{order.destination?.outletName || order.company} · {fmt(order.lines.reduce((n, l) => n + Number(l.kg), 0))} кг</p><div className="op-actions"><button disabled={busy} onClick={() => submit(confirm)}>Подтвердить</button><button className="secondary" onClick={() => setConfirm(null)}>Назад</button></div></div>}
    </article>;
}
export default function Orders({
  data,
  user,
  run,
  busy,
  onReturn,
  initialAction,
  initialOutlet = '',
  onShops
}) {
  const admin = user.role === 'super_admin';
  const cartRef=useRef(null);
  const reviewRef = useRef(null),
    closePhotoRef = useRef(null),
    photoFocus = useRef(null);
  const key = 'cond.trade-cart.v1:' + user.id;
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  };
  const [cart, setCart] = useState(() => read().cart || {}),
    [outletId, setOutletId] = useState(() => initialOutlet || read().outletId || ''),
    [company, setCompany] = useState(''),
    [editingShop, setEditingShop] = useState(false),
    [note, setNote] = useState(() => read().note || ''),
    [deliveryDate, setDate] = useState(()=>{const d=read();return d.deliveryDate&&Object.values(d.cart||{}).some(v=>Number(v)>0)?d.deliveryDate:today();}),
    [view, setView] = useState(admin ? 'submitted' : 'catalog'),
    [focusId,setFocusId]=useState(null),
    [orderSearch,setOrderSearch]=useState(''),
    [dueFilter,setDueFilter]=useState('all'),
    [search, setSearch] = useState(''),
    [measure, setMeasure] = useState('kg'),
    [review, setReview] = useState(false),
    [print, setPrint] = useState(null),
    [zoom, setZoom] = useState(null),
    [saved, setSaved] = useState('');
  useEffect(() => {
    if (review) reviewRef.current?.scrollIntoView({
      block: 'start'
    });
  }, [review]);
  useEffect(() => {
    if (!zoom) return;
    photoFocus.current = document.activeElement;
    closePhotoRef.current?.focus();
    const key = e => {
      if (e.key === 'Escape') setZoom(null);
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      photoFocus.current?.focus();
    };
  }, [zoom]);
  useEffect(() => {
    if (initialOutlet) {
      setOutletId(initialOutlet);
      setView('catalog');
    }
  }, [initialOutlet]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({
        cart,
        outletId,
        note,
        deliveryDate
      }));
    } catch {}
  }, [cart, outletId, note, deliveryDate, key]);
  const outlets = data.outlets || [],
    outlet = outlets.find(o => o.id === outletId),
    customer = (data.customers || []).find(c => c.id === outlet?.customerId);
  const lines = Object.entries(cart).filter(([, kg]) => Number(kg) > 0).map(([id, kg]) => ({
    productId: Number(id),
    kg: Number(kg)
  }));
  const kg = lines.reduce((s, l) => s + l.kg, 0);
  const pricingProducts=customerPricing(data.products,data.clientPrices||[],outlet,deliveryDate);
  const quote=cartPricing(lines,pricingProducts);
  const products = pricingProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(b.availableKg>0)-Number(a.availableKg>0)||Number(b.salePrice!=null)-Number(a.salePrice!=null));
  const pending = lines.filter(l => l.kg > Number(data.products.find(p => p.id === l.productId)?.availableKg || 0));
  const change = (p, v) => {
    setReview(false);
    const factor = (measure === 'box'||p.packKg) ? Number(p.weight) : 1;
    setCart(c => ({
      ...c,
      [p.id]: Math.round(Math.max(0, Number(v) || 0) * factor * 10000) / 10000
    }));
  };
  useEffect(()=>{
    if(!initialAction)return;
    setOrderSearch('');setDueFilter('all');
    if(initialAction.kind==='catalog'){setView('catalog');setReview(false);}else if(initialAction.kind==='order'){
      const order=data.orders.find(o=>o.id===initialAction.id);
      setFocusId(initialAction.id);setView(['submitted','approved'].includes(order?.status)?order.status:'history');
    }else if(initialAction.kind==='filter'){setFocusId(null);setView(initialAction.status);}
  },[initialAction]);
  useEffect(()=>{if(focusId)document.getElementById('op-order-'+focusId)?.scrollIntoView({block:'start'});},[focusId]);
  const anchor=data.presentationDate||today();
  const allowed = admin ? outlet || company.trim() : outlet;
  const history = data.orders.filter(o=>{
    if(focusId)return o.id===focusId;
    if(view==='submitted'&&o.status!=='submitted'||view==='approved'&&o.status!=='approved')return false;
    if(dueFilter==='today'&&o.deliveryDate!==anchor)return false;
    if(dueFilter==='late'&&(!['submitted','approved'].includes(o.status)||!o.deliveryDate||o.deliveryDate>=anchor))return false;
    return [o.id,o.company,o.destination?.outletName,o.destination?.customerName,...o.lines.map(l=>l.name)].join(' ').toLowerCase().includes(orderSearch.trim().toLowerCase());
  });
  if(['submitted','approved'].includes(view))history.sort((a,b)=>String(a.deliveryDate||'9999').localeCompare(String(b.deliveryDate||'9999')));
  if (print) return <section className="op-card op-print-document"><div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={() => setPrint(null)}>Назад</button></div><h2>{print.status === 'shipped' ? 'Накладная' : 'Заявка'} № {print.id.slice(0, 8).toUpperCase()}</h2><p><b>{print.company}</b></p>{print.destination && <p>{print.destination.outletName}<br />{print.destination.address}<br />{print.destination.contact} {print.destination.phone}</p>}<p>Дата: {print.shippedAt ? new Date(print.shippedAt).toLocaleDateString('ru-RU') : print.deliveryDate} · <Badge status={print.status} /></p><Table mobileCards headers={['Товар', 'Количество', 'Цена за единицу, ₸', 'Сумма, ₸']}>{print.lines.map(l => <tr key={l.productId}><td>{l.name}</td><td>{fmt(l.kg)} {l.unit||'кг'}</td><td>{l.price == null ? 'Согласуется' : fmt(l.price)}</td><td>{l.price == null ? '—' : fmt(l.kg * l.price)}</td></tr>)}</Table><p className="op-order-total">{print.status === 'submitted' ? 'Цены после согласования' : fmt(print.total) + ' ₸'}</p><p>{print.note}</p><div className="op-signatures"><span>Отпустил: __________</span><span>Получил: __________</span></div><p className="op-muted">Внутренний складской документ.</p></section>;
  return <>{saved && <div className="op-alert success" role="status">{saved}<button className="ghost" aria-label="Закрыть" onClick={() => setSaved('')}>×</button></div>}<section className="op-card op-order-switcher"><div className="op-section-heading"><div><span className="op-eyebrow">{admin ? 'ЗАЯВКИ И ОТГРУЗКИ' : 'ТОРГОВЫЙ ПРЕДСТАВИТЕЛЬ'}</span><h2>{view === 'catalog' ? 'Новый заказ' : 'Заявки'}</h2></div>{view !== 'catalog' && <button onClick={() => setView('catalog')}>+ Собрать заказ</button>}</div><nav className="op-report-tabs op-order-tabs" aria-label="Заявки">{(admin ? [['submitted', 'Новые'], ['approved', 'К отгрузке'], ['history', 'Все заявки'], ['catalog', 'Новый заказ']] : [['catalog', 'Новый заказ'], ['history', 'Мои заявки']]).map(([id, label]) => <button key={id} aria-pressed={view === id} className={view === id ? 'active' : ''} onClick={() => {
          setView(id);setFocusId(null);setOrderSearch('');setDueFilter('all');
          setReview(false);
        }}>{label}{admin && ['submitted', 'approved'].includes(id) ? ' · ' + data.orders.filter(o => o.status === id).length : ''}</button>)}</nav></section>
{view !== 'catalog' ? <section className="op-card"><h2>{focusId?'Выбранная заявка':view === 'approved' ? 'К отгрузке' : view === 'submitted' ? 'Новые' : 'История'}</h2>{focusId?<button className="secondary" onClick={()=>setFocusId(null)}>← Все заявки</button>:<div className="op-order-filters"><Field label="Найти заявку" value={orderSearch} placeholder="Магазин, клиент или товар" onChange={e=>setOrderSearch(e.target.value)}/><Field label="Срок поставки"><select value={dueFilter} onChange={e=>setDueFilter(e.target.value)}><option value="all">Все даты</option><option value="today">На сегодня</option><option value="late">Срок прошёл</option></select></Field></div>}{history.length ? history.map(o => <OrderCard key={o.id + o.status} order={o} products={data.products} admin={admin} run={run} busy={busy} onPrint={setPrint} onReturn={onReturn} />) : <Empty>{orderSearch||dueFilter!=='all'?'Ничего не найдено.':'Заявок пока нет'}</Empty>}</section> : <>
{!review&&<><section className="op-card op-catalog-header"><FormProgress steps={['Магазин','Товары','Отправка']} current={outletId||admin&&company.trim()?1:0}/>{outlet && !editingShop ? <button type="button" className="op-selected-shop" onClick={()=>setEditingShop(true)}><span><b>{outlet.name}</b><small>{outlet.address}</small></span><span>Изменить</span></button> : <ShopPicker outlets={outlets} onPick={id=>{setOutletId(id);setEditingShop(false);setReview(false);}}/>}{!admin && !outlets.length && <div className="op-missing">Администратор должен закрепить за вами магазины.{onShops && <button className="secondary" onClick={onShops}>Мои магазины</button>}</div>}{admin&&!outletId&&<details className="op-help"><summary>Заказ без магазина</summary><Field label="Клиент / фирма" value={company} onChange={e=>setCompany(e.target.value)} placeholder="Название клиента"/></details>}{(outletId||admin&&company.trim())&&<><Field label="Найти товар" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Название товара" /><div className="op-catalog-units"><span>Заказываем:</span><button className={measure === 'box' ? '' : 'secondary'} aria-pressed={measure === 'box'} onClick={() => setMeasure('box')}>Коробками</button><button className={measure === 'kg' ? '' : 'secondary'} aria-pressed={measure === 'kg'} onClick={() => setMeasure('kg')}>В килограммах</button></div><details className="op-catalog-help"><summary>Наличие и цены</summary><p>Можно заказать больше остатка. Цены согласует администратор.</p></details></>}</section>
{(outletId||admin&&company.trim())&&<><div ref={cartRef} className="op-shop-grid op-sales-grid">{products.map(p => {
          const quantity = (Number(cart[p.id]) || 0) / ((measure === 'box'||p.packKg) ? Number(p.weight) : 1);
          return <article key={p.id} className="op-catalog-card"><ProductPhoto product={p} onOpen={() => setZoom(p)} /><div className="op-catalog-body"><h3>{p.name}</h3><p className="op-muted">Коробка {fmt(p.weight)} кг</p><p className={p.salePrice==null?'op-missing':'op-sale-price'}>{p.salePrice==null?'Цена не указана':moneyFmt(p.salePrice)+' ₸ / кг'}</p><div className={'op-availability ' + (p.availableKg > 0 ? 'in-stock' : 'to-make')}>{p.availableKg > 0 ? 'Есть ' + fmt(p.availableKg) + ' кг' : 'Под производство'}</div><div className="op-quantity"><button className="secondary" aria-label={'Уменьшить ' + p.name} onClick={() => change(p, quantity - 1)} disabled={!quantity}>−</button><NumericInput aria-label={p.name + ': ' + ((measure === 'box'||p.packKg) ? 'коробок' : 'кг')} type="number" min="0" step={(measure === 'box'||p.packKg) ? '1' : '0.001'} value={quantity || ''} placeholder="0" onChange={e => change(p, e.target.value)} /><button className="secondary" aria-label={'Добавить ' + p.name} onClick={() => change(p, quantity + 1)}>+</button></div><small className="op-muted">{(measure === 'box'||p.packKg) ? 'коробок' : 'кг'}{quantity > 0 ? ' · ' + fmt(Number(cart[p.id])) + ' кг в заказе' : ''}</small></div></article>;
        })}</div>{!products.length && <Empty>Товар не найден. Измените поиск.</Empty>}</>}
</>}{!review ? (lines.length > 0 && <div className="op-cart-bar"><div><strong>{fmt(kg)} кг{quote.complete?' · '+moneyFmt(quote.total)+' ₸':' · Цена не указана'}</strong><small>{outlet?.name || 'Выберите магазин'}</small></div><button disabled={!lines.length || !allowed || busy} onClick={() => {if(!cartRef.current||Array.from(cartRef.current.querySelectorAll('input')).every(i=>i.reportValidity()))setReview(true);}}>К итогу заказа</button></div>) : <section ref={reviewRef} className="op-card op-cart-review"><h2>Проверьте заказ</h2><p><b>{outlet?.name || company}</b>{outlet && <><br />{outlet.address}</>}</p><CartReviewLines rows={quote.rows} products={data.products} onRemove={id=>setCart(c=>({...c,[id]:0}))}/>{pending.length > 0 && <div className="op-alert">Часть под производство. Подтвердит администратор.</div>}<form onSubmit={e => {
          e.preventDefault();
          run(async () => {
            const result = await api('/orders', {
              lines,
              outletId: outletId || undefined,
              company,
              deliveryDate,
              note
            });
            setSaved(result.pending ? '' : 'Заказ отправлен.');
            setCart({});
            setNote('');
            setReview(false);
            setView('history');
          }, '');
        }}><div className="op-form-grid"><Field label="Нужно к дате" min={admin?undefined:today()} required type="date" value={deliveryDate} onChange={e => setDate(e.target.value)} /><Field label="Пожелания магазина"><textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Время, упаковка, комментарий" /></Field></div>{deliveryDate<today()&&<p className="op-missing">Дата уже прошла.</p>}<div className="op-submit-row"><div><strong>{quote.complete?moneyFmt(quote.total)+' ₸':'Цена не указана'}</strong><p className="op-muted">{fmt(kg)} кг · {quote.complete?'Предварительная сумма заявки':'Цены согласует администратор'}</p></div><div className="op-actions"><button type="button" className="secondary" onClick={() => setReview(false)}>Изменить</button><button disabled={busy || !lines.length || !allowed}>Отправить заказ</button></div></div></form></section>}
</>}{zoom && <section className="op-product-view" role="dialog" aria-modal="true" aria-label={zoom.name} onClick={e => {
      if (e.target === e.currentTarget) setZoom(null);
    }} onKeyDown={e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        closePhotoRef.current?.focus();
      }
    }}><div className="op-product-view-card"><button ref={closePhotoRef} className="secondary" onClick={() => setZoom(null)}>Закрыть</button><ProductPhoto product={zoom} /><h2>{zoom.name}</h2><p>{zoom.description || 'Описание ещё не добавлено'}</p><p>Коробка {fmt(zoom.weight)} кг · доступно {fmt(zoom.availableKg)} кг</p></div></section>}</>;
}
