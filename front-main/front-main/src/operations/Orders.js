import BackToReport from './BackToReport';
import LegacyShipmentPicker,{shipmentStatus} from './LegacyShipmentPicker';
import {boxWord} from './boxWord';
import {priceForPack} from '../../../../back-main/back-main/src/domain/catalogPrice';
import OrderProductCard from './OrderProductCard';
import NumericInput from './SafeNumericInput';
import {groupSalesCatalog} from './salesCatalog';
import FormProgress from './FormProgress';
import ShopPicker from './ShopPicker';
import React, { useState, useEffect, useRef } from 'react';
import { api, fmt, moneyFmt, today } from './api';
import { Field, Badge, Empty, Table } from './Fields';
import ProductPhoto from './ProductPhoto';
import {orderReadiness,canApproveOrder} from './orderReadiness';
import { InvoiceBatch } from './PrintDocuments';

const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const lineTotal = l => l.packId ? money(Number(l.boxes) * Number(l.price)) : money(Number(l.kg) * Number(l.price));
const orderQuantity=order=>{const boxes=order.lines.reduce((s,l)=>s+Number(l.packId?l.boxes:0),0),kg=order.lines.filter(l=>!l.packId).reduce((s,l)=>s+Number(l.kg||0),0);return [boxes>0?fmt(boxes)+' '+boxWord(boxes):'',kg>0?fmt(kg)+' кг':''].filter(Boolean).join(' · ');};
const lineQuantity = l => l.packId ? `${fmt(l.boxes)} ${boxWord(l.boxes)}` : `${fmt(l.kg)} кг`;

function OrderCard({ order, admin, run, busy, onPrint, onReturn, onPlan, onOpen, full=false, products = [] }) {
    const [prices, setPrices] = useState(order.lines.map(l => l.price ?? ''));
    const [confirm, setConfirm] = useState(null);
    const [shipmentPacks,setShipmentPacks]=useState({}),[shipmentUnpack,setShipmentUnpack]=useState({});
    const shipmentReady=!admin||order.status!=='approved'||order.lines.every((line,i)=>line.packId||shipmentStatus(line,products.find(p=>p.id===line.productId),shipmentPacks[i],shipmentUnpack[i]).complete);
    const displayPrices = order.lines.map((l, i) => {
        const value = admin && order.status === 'submitted' ? prices[i] : l.price;
        return value === '' || value == null ? null : Number(value);
    });
    const displayTotal = displayPrices.some(price => price === null) ? null : money(order.lines.reduce((sum, line, index) => sum + (line.packId ? Number(line.boxes) * displayPrices[index] : Number(line.kg) * displayPrices[index]), 0));
    const readiness=orderReadiness(order,products),missing=readiness.missing;
    const submit = status => run(() => api('/orders/' + order.id, status === 'approved' ? { status, prices } : status==='shipped'?{status,shipmentPacks,shipmentUnpack}:{ status }, 'PATCH'), 'Изменения сохранены');
    if(!full)return <button className="ux-order-summary" onClick={onOpen}>
        <span><b>{order.destination?.outletName||order.company}</b><small>На {order.deliveryDate} · № {order.id.slice(0,8).toUpperCase()}</small><small>{order._pending?'Ждёт отправки':order.status==='approved'?(shipmentReady?'В резерве · можно отгрузить':'В резерве · выбрать коробки'):order.status==='submitted'?(readiness.unknown?'Уточнить остаток':readiness.ready?'Есть на складе · согласовать':'Нужно изготовить'):order.status==='shipped'?'Отгружено':'Отменено'}</small></span>
        <span><strong>{displayTotal===null?'Цена не указана':moneyFmt(displayTotal)+' ₸'}</strong><small>{orderQuantity(order)}</small></span>
    </button>;
    return <article id={'op-order-' + order.id} className="op-order">
        <div className="op-section-heading"><div>{order._pending ? <span className="op-badge">На телефоне · ждёт отправки</span> : <Badge status={order.status} />}<h3>{order.destination?.outletName || order.company}</h3>{order.destination && <p className="op-muted">{order.destination.customerName} · {order.destination.address}</p>}<p className="op-muted">№ {order.id.slice(0, 8).toUpperCase()} · На {order.deliveryDate}</p></div><button className="secondary" disabled={order._pending} onClick={() => onPrint(order)}>{order.status === 'shipped' ? 'Накладная' : 'Печать заявки'}</button></div>
        <details className="op-help suite-order-lines" open={admin && order.status === 'submitted'}><summary>Товары · {order.lines.length} поз. · {orderQuantity(order)}</summary><Table mobileCards headers={['Товар', 'Количество', 'Цена, ₸', 'Сумма']}>
            {order.lines.map((line, i) => <tr key={line.packId || line.productId + '-' + i}><td>{line.name}</td><td>{lineQuantity(line)}</td><td>{admin && order.status === 'submitted' ? <NumericInput aria-label={`Цена за ${line.packId?'коробку':'кг'}: ${line.name}`} type="number" min="0" step="0.01" value={prices[i]} onChange={e => { const value = e.target.value; setPrices(p => p.map((x, j) => i === j ? value : x)); }} /> : line.price == null ? 'Согласуется' : `${fmt(line.price)} ₸`}</td><td>{displayPrices[i] === null ? '—' : moneyFmt(line.packId ? Number(line.boxes) * displayPrices[i] : Number(line.kg) * displayPrices[i]) + ' ₸'}</td></tr>)}
        </Table></details>
        <p className="op-order-total">{order.status === 'submitted' ? 'Предварительно: ' : 'Итого: '}{displayTotal === null ? 'Цена не указана' : moneyFmt(displayTotal) + ' ₸'}</p>
        {order.note && <p className="op-muted">Комментарий: {order.note}</p>}
        {admin && missing.length > 0 && <div className="op-missing"><b>{readiness.unknown?'Нужно уточнить остаток':missing.every(l=>products.find(p=>p.id===l.productId)?.allowNegativeStock)?'Можно отгрузить в минус':'Нужно изготовить'}</b>{missing.map(line => <span key={line.packId || line.productId}>{line.name}: {line.unknown?'остаток недоступен':`ещё ${fmt(line.missing)} ${line.packId?boxWord(line.missing):'кг'}${line.capacityKg?' по '+fmt(line.capacityKg)+' кг':''}`}</span>)}{onPlan&&!readiness.unknown&&<button className="secondary" onClick={onPlan}>Что изготовить →</button>}</div>}
        {admin&&order.status==='approved'&&order.lines.map((line,i)=>!line.packId&&<LegacyShipmentPicker key={line.productId} line={line} product={products.find(p=>p.id===line.productId)} value={shipmentPacks[i]||[]} unpack={shipmentUnpack[i]===true} onUnpackChange={value=>{setShipmentUnpack(s=>({...s,[i]:value}));setConfirm(null);}} onChange={value=>{setShipmentPacks(s=>({...s,[i]:value}));setShipmentUnpack(s=>({...s,[i]:false}));setConfirm(null);}}/>)}
        {order.status==='shipped'&&order.lines.filter(l=>l.shipmentPacks?.length).map(l=><p className="op-muted" key={l.productId}>{l.name}: {l.shipmentPacks.map(p=>fmt(p.boxes)+' '+boxWord(p.boxes)+' по '+fmt(p.capacityKg)+' кг').join(' · ')}{Number(l.shipmentLooseKg)>0?' · без коробок '+fmt(l.shipmentLooseKg)+' кг':''}{Number(l.shipmentOpenedKg)>0?' · остаток из открытой коробки '+fmt(l.shipmentOpenedKg)+' кг':''}</p>)}
        <div className="op-actions">
            {order.status === 'shipped' && onReturn && <button className="secondary" onClick={() => onReturn(order.id)}>Возврат / Обмен</button>}
            {admin && canApproveOrder(order,products) && <button disabled={busy || prices.some(p => p === '' || p == null || Number(p) < 0)} onClick={() => setConfirm('approved')}>Подтвердить заказ</button>}
            {!order._pending && admin && order.status === 'approved' && <button disabled={busy||!shipmentReady} onClick={() => setConfirm('shipped')}>Подтвердить отгрузку</button>}
            {!order._pending && ['submitted', 'approved'].includes(order.status) && <button className="ghost danger" disabled={busy} onClick={() => setConfirm('cancelled')}>Отменить заявку</button>}
        </div>
        {confirm && <div className="op-order-confirm"><b>{confirm === 'approved' ? 'Согласовать цены и занять коробки в резерв?' : confirm === 'shipped' ? 'Коробки переданы магазину? Подтвердить списание?' : 'Отменить эту заявку?'}</b><p>{order.destination?.outletName || order.company} · {orderQuantity(order)}</p><div className="op-actions"><button disabled={busy||confirm==='shipped'&&!shipmentReady} onClick={() => submit(confirm)}>Подтвердить</button><button className="secondary" onClick={() => setConfirm(null)}>Назад</button></div></div>}
    </article>;
}

export default function Orders({ data, user, run, busy, onReturn, initialAction, initialOutlet = '', onShops, onNavigate }) {
    const admin = user.role === 'super_admin';
    const cartRef = useRef(null);
    const reviewRef = useRef(null);
    const closePhotoRef = useRef(null);
    const photoFocus = useRef(null);
    const key = 'cond.trade-cart.boxes.v1:' + user.id;
    const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
    const [cart, setCart] = useState(() => read().cart || {});
    const [outletId, setOutletId] = useState(() => initialOutlet || read().outletId || '');
    const [company, setCompany] = useState('');
    const [editingShop, setEditingShop] = useState(false);
    const [note, setNote] = useState(() => read().note || '');
    const [deliveryDate, setDate] = useState(() => { const d = read(); return d.deliveryDate && Object.values(d.cart || {}).some(v => Number(v) > 0) ? d.deliveryDate : today(); });
    const [view, setView] = useState(admin ? 'submitted' : 'catalog');
    const [focusId, setFocusId] = useState(null);
    const [orderSearch, setOrderSearch] = useState('');
    const [dueFilter, setDueFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [catalogLimit,setCatalogLimit]=useState(12);
    useEffect(()=>setCatalogLimit(12),[search,outletId]);
    const [review, setReview] = useState(false);
    const [print, setPrint] = useState(null);
    const [zoom, setZoom] = useState(null);
    const [saved, setSaved] = useState('');
    const [batchPrint, setBatchPrint] = useState(false);

    useEffect(() => { if (review) reviewRef.current?.scrollIntoView({ block: 'start' }); }, [review]);
    useEffect(() => {
        if (!zoom) return;
        photoFocus.current = document.activeElement;
        closePhotoRef.current?.focus();
        const handler = e => { if (e.key === 'Escape') setZoom(null); };
        document.addEventListener('keydown', handler);
        return () => { document.removeEventListener('keydown', handler); photoFocus.current?.focus(); };
    }, [zoom]);
    useEffect(() => { if (initialOutlet) { setOutletId(initialOutlet); setView('catalog'); } }, [initialOutlet]);
    useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ cart, outletId, note, deliveryDate })); } catch {} }, [cart, outletId, note, deliveryDate, key]);

    const outlets = data.outlets || [];
    const outlet = outlets.find(o => o.id === outletId);
    const customer = (data.customers || []).find(c => c.id === outlet?.customerId);
    const catalog = (data.products || []).flatMap(product => (product.packs || []).map(pack => ({ ...product, pack })));
    const priceFor=item=>priceForPack({rules:data.clientPrices||[],productId:item.id,pack:item.pack,customerId:outlet?.customerId,outletId:outlet?.id,onDate:deliveryDate,standardPrice:item.salePrice});
    catalog.forEach(item => { item.price = priceFor(item); });
    const lines = Object.entries(cart).filter(([, boxes]) => Number(boxes) > 0).map(([packId, boxes]) => {
        const item = catalog.find(x => String(x.pack.id) === String(packId));
        return item ? { productId: item.id, packId: item.pack.id, boxes: Number(boxes), price: item.price, name: item.name + ' · ' + fmt(item.pack.capacityKg) + ' кг', capacityKg: item.pack.capacityKg } : null;
    }).filter(Boolean);
    const totalBoxes = lines.reduce((sum, line) => sum + Number(line.boxes), 0);
    const quote = { rows: lines, complete: lines.every(line => line.price != null), total: money(lines.reduce((sum, line) => sum + (line.price == null ? 0 : Number(line.boxes) * Number(line.price)), 0)) };
    const products = catalog.filter(item => (item.name + ' ' + item.pack.capacityKg).toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(b.pack.availableBoxes > 0) - Number(a.pack.availableBoxes > 0));
    const groupedProducts=groupSalesCatalog(products);
    const cartValid=lines.every(line=>Number.isInteger(Number(line.boxes))&&Number(line.boxes)>0);
    const pending = lines.filter(line => Number(line.boxes) > Number(catalog.find(x => String(x.pack.id) === String(line.packId))?.pack.availableBoxes || 0));
    const change = (item, value) => {
        setReview(false);
        setCart(c => ({ ...c, [item.pack.id]: value === '' ? '' : Math.max(0, Number(value) || 0) }));
    };
    const repeatLast = () => {
        const last = (data.orders || []).find(order => (order.lines || []).some(line => line.packId));
        if (!last) return;
        const next = {};
        for (const line of last.lines || []) if (line.packId) next[line.packId] = Number(line.boxes || 0);
        setOutletId(last.destination?.outletId || outletId);
        setCart(next);
        setReview(true);
        setView('catalog');
    };
    useEffect(() => {
        if (!initialAction) return;
        setOrderSearch(''); setDueFilter('all');
        if (initialAction.kind === 'catalog') { setView('catalog'); setReview(false);if(initialAction.query)setSearch(initialAction.query); }
        else if (initialAction.kind === 'order') { const order = data.orders.find(o => o.id === initialAction.id); setFocusId(initialAction.id); setView(['submitted', 'approved'].includes(order?.status) ? order.status : 'history'); }
        else if (initialAction.kind === 'filter') { setFocusId(null); setView(initialAction.status);setDueFilter(initialAction.due||'all'); }
    }, [initialAction]);
    useEffect(() => { if (focusId) document.getElementById('op-order-' + focusId)?.scrollIntoView({ block: 'start' }); }, [focusId]);
    const anchor = data.presentationDate || today();
    const allowed = admin ? outlet || company.trim() : outlet;
    const history = data.orders.filter(order => {
        if (focusId) return order.id === focusId;
        if (view === 'submitted' && order.status !== 'submitted' || view === 'approved' && order.status !== 'approved') return false;
        if(admin&&view==='history'&&!['shipped','cancelled'].includes(order.status))return false;
        if(view==='active'&&!['submitted','approved'].includes(order.status))return false;
        if(view==='ready'&&(!['submitted','approved'].includes(order.status)||!orderReadiness(order,data.products).ready))return false;
        if(view==='need'&&(order.status!=='submitted'||orderReadiness(order,data.products).ready))return false;
        if (dueFilter === 'today' && order.deliveryDate !== anchor) return false;
        if (dueFilter === 'late' && (!['submitted', 'approved'].includes(order.status) || !order.deliveryDate || order.deliveryDate >= anchor)) return false;
        return [order.id, order.company, order.destination?.outletName, order.destination?.customerName, ...order.lines.map(line => line.name)].join(' ').toLowerCase().includes(orderSearch.trim().toLowerCase());
    });
    if (['submitted', 'approved'].includes(view)) history.sort((a, b) => String(a.deliveryDate || '9999').localeCompare(String(b.deliveryDate || '9999')));

    if (batchPrint) return <InvoiceBatch orders={(data.orders || []).filter(order => order.status === 'shipped')} onClose={() => setBatchPrint(false)} />;
    if (print) return <section className="op-card op-print-document"><div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={() => setPrint(null)}>Назад</button></div><h2>{print.status === 'shipped' ? 'Накладная' : 'Заявка'} № {print.id.slice(0, 8).toUpperCase()}</h2><p><b>{print.company}</b></p>{print.destination && <p>{print.destination.outletName}<br />{print.destination.address}<br />{print.destination.contact} {print.destination.phone}</p>}<p>Дата: {print.shippedAt ? new Date(print.shippedAt).toLocaleDateString('ru-RU') : print.deliveryDate}</p><Table mobileCards headers={['Товар', 'Коробок', 'Цена за коробку, ₸', 'Сумма, ₸']}>{print.lines.map((line, i) => <tr key={line.packId || line.productId + '-' + i}><td>{line.name}</td><td>{fmt(line.boxes || line.kg)}</td><td>{line.price == null ? 'Согласуется' : fmt(line.price)}</td><td>{line.price == null ? '—' : fmt(lineTotal(line))}</td></tr>)}</Table><p className="op-order-total">{print.status === 'submitted' ? 'Цены после согласования' : fmt(print.total) + ' ₸'}</p><p>{print.note}</p><div className="op-signatures"><span>Отпустил: __________</span><span>Получил: __________</span></div><p className="op-muted">Товар отпускается коробками.</p></section>;

    return <>{saved && <div className="op-alert success" role="status">{saved}<button className="ghost" aria-label="Закрыть" onClick={() => setSaved('')}>×</button></div>}
        <BackToReport action={initialAction} onNavigate={onNavigate}/><section className="op-card op-order-switcher"><div className="op-section-heading"><div><span className="op-eyebrow">{admin ? 'ЗАЯВКИ И ОТГРУЗКИ' : 'ТОРГОВЫЙ ПРЕДСТАВИТЕЛЬ'}</span><h2>{view === 'catalog' ? 'Новый заказ коробками' : 'Заявки'}</h2></div><div className="op-actions">{view !== 'catalog' && <button onClick={() => setView('catalog')}>+ Собрать заказ</button>}{admin && <button className="secondary" onClick={() => setBatchPrint(true)}>Печать накладных</button>}</div></div><nav className="op-report-tabs op-order-tabs" aria-label="Заявки">{(admin ? [['submitted', 'Новые'], ['ready', 'Готовы'], ['need', 'Нужно изготовить'], ['history', 'История']] : [['catalog', 'Новый заказ'], ['history', 'Мои заявки']]).map(([id, label]) => <button key={id} aria-pressed={view === id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setFocusId(null); setOrderSearch(''); setDueFilter('all'); setReview(false); }}>{label}{admin && ['submitted', 'approved'].includes(id) ? ' · ' + data.orders.filter(o => o.status === id).length : ''}</button>)}</nav></section>
        {view !== 'catalog' ? <section className="op-card"><h2>{focusId ? 'Выбранная заявка' : view === 'approved' ? 'К отгрузке' : view === 'submitted' ? 'Новые' : view==='ready'?'Готовы':view==='need'?'Нужно изготовить':view==='active'?'Текущие заявки':'История'}</h2>{focusId ? <button className="secondary" onClick={() => setFocusId(null)}>← Все заявки</button> : <div className="op-order-filters"><Field label="Найти заявку" value={orderSearch} placeholder="Магазин, клиент или товар" onChange={e => setOrderSearch(e.target.value)} /><Field label="Срок поставки"><select value={dueFilter} onChange={e => setDueFilter(e.target.value)}><option value="all">Все даты</option><option value="today">На сегодня</option><option value="late">Срок прошёл</option></select></Field></div>}{history.length ? history.map(order => <OrderCard key={order.id + order.status} order={order} full={Boolean(focusId)} onOpen={()=>setFocusId(order.id)} products={data.products} admin={admin} run={run} busy={busy} onPrint={setPrint} onReturn={onReturn} onPlan={onNavigate?()=>onNavigate('production',{kind:'production-tasks'}):null} />) : <Empty>{orderSearch || dueFilter !== 'all' ? 'Ничего не найдено.' : 'Заявок пока нет'}</Empty>}</section> : <>
            {!review && <>{!admin&&data.orders?.length>0&&<button className="ghost" onClick={repeatLast}>Повторить последний заказ</button>}<section className="op-card op-catalog-header"><FormProgress steps={['Магазин', 'Коробки', 'Отправка']} current={outletId || admin && company.trim() ? 1 : 0} />{outlet && !editingShop ? <button type="button" className="op-selected-shop" onClick={() => setEditingShop(true)}><span><b>{outlet.name}</b><small>{outlet.address}</small></span><span>Изменить</span></button> : <ShopPicker outlets={outlets} onPick={id => { setOutletId(id); setEditingShop(false); setReview(false); }} />}{!admin && !outlets.length && <div className="op-missing">Администратор должен закрепить за вами магазины.{onShops && <button className="secondary" onClick={onShops}>Мои магазины</button>}</div>}{admin && !outletId && <details className="op-help"><summary>Заказ без магазина</summary><Field label="Клиент / фирма" value={company} onChange={e => setCompany(e.target.value)} placeholder="Название клиента" /></details>}{(outletId || admin && company.trim()) && <><Field label="Найти товар" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Название товара" /><details className="op-catalog-help"><summary>Наличие и цены</summary><p>Продажа и заказ — только коробками. Цена указана за коробку.</p></details></>}</section>
                {(outletId || admin && company.trim()) && <><div ref={cartRef} className="op-shop-grid op-sales-grid">{groupedProducts.slice(0,catalogLimit).map(items=><OrderProductCard key={items[0].id} items={items} cart={cart} onChange={change} onZoom={setZoom} busy={busy}/>)}</div>{groupedProducts.length>catalogLimit&&<button className="secondary op-wide-action" onClick={()=>setCatalogLimit(n=>n+12)}>Показать ещё · {groupedProducts.length-catalogLimit}</button>}{!products.length && <Empty>Товар не найден. Измените поиск.</Empty>}</>}
            </>}{!review ? (lines.length > 0 && <div className="op-cart-bar"><div><strong>{fmt(totalBoxes)} {boxWord(totalBoxes)}{quote.complete ? ' · ' + moneyFmt(quote.total) + ' ₸' : ' · Цена не указана'}</strong><small>{cartValid?(outlet?.name || company.trim() || 'Выберите магазин'):'Количество коробок — целое число'}</small></div><button disabled={!lines.length || !allowed || busy || !cartValid} onClick={() => { if (!cartRef.current || Array.from(cartRef.current.querySelectorAll('input')).every(i => i.reportValidity())) setReview(true); }}>К итогу заказа</button></div>) : <section ref={reviewRef} className="op-card op-cart-review"><h2>Проверьте заказ</h2><p><b>{outlet?.name || company}</b>{outlet && <><br />{outlet.address}</>}</p><Table mobileCards headers={['Товар', 'Коробок', 'Цена', 'Сумма']}>{quote.rows.map(line => <tr key={line.packId}><td>{line.name}</td><td>{fmt(line.boxes)}</td><td>{line.price == null ? '—' : moneyFmt(line.price) + ' ₸'}</td><td>{line.price == null ? '—' : moneyFmt(Number(line.boxes) * Number(line.price)) + ' ₸'}</td></tr>)}</Table>{pending.length > 0 && <div className="op-alert">Часть под производство. Подтвердит администратор.</div>}<form onSubmit={e => { e.preventDefault(); run(async () => { const result = await api('/orders', { lines: lines.map(line => ({ productId: line.productId, packId: line.packId, boxes: line.boxes })), outletId: outletId || undefined, company, deliveryDate, note }); setSaved(result.pending ? '' : 'Заказ отправлен.'); setCart({}); setNote(''); setReview(false); setView(admin?'submitted':'history'); }, ''); }}><div className="op-form-grid"><Field label="Нужно к дате" min={admin ? undefined : today()} required type="date" value={deliveryDate} onChange={e => setDate(e.target.value)} /><Field label="Пожелания магазина"><textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Время, упаковка, комментарий" /></Field></div>{deliveryDate < today() && <p className="op-missing">Дата уже прошла.</p>}<div className="op-submit-row"><div><strong>{quote.complete ? moneyFmt(quote.total) + ' ₸' : 'Цена не указана'}</strong><p className="op-muted">{fmt(totalBoxes)} {boxWord(totalBoxes)} · {quote.complete ? 'Предварительная сумма заявки' : 'Цены согласует администратор'}</p></div><div className="op-actions"><button type="button" className="secondary" onClick={() => setReview(false)}>Изменить</button><button disabled={busy || !lines.length || !allowed || !cartValid}>Отправить заказ</button></div></div></form></section>}
        </>}{zoom && <section className="op-product-view" role="dialog" aria-modal="true" aria-label={zoom.name} onClick={e => { if (e.target === e.currentTarget) setZoom(null); }} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); closePhotoRef.current?.focus(); } }}><div className="op-product-view-card"><button ref={closePhotoRef} className="secondary" onClick={() => setZoom(null)}>Закрыть</button><ProductPhoto product={zoom} /><h2>{zoom.name}</h2><p>{zoom.description || 'Описание ещё не добавлено'}</p><p>Коробка {fmt(zoom.pack?.capacityKg || zoom.weight)} кг · доступно {fmt(zoom.pack?.availableBoxes || 0)} {boxWord(zoom.pack?.availableBoxes || 0)}</p></div></section>}
    </>;
}
