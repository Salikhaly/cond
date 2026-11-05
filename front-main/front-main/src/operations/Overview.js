import {boxWord} from './boxWord';
import React,{useMemo,useState} from 'react';
import {fmt,moneyFmt,today} from './api';
import {Empty} from './Fields';
import {businessPlan} from './businessPlan';
import {orderReadiness} from './orderReadiness';
import Icon from './Icon';
import {stockSaleValue} from './stockSaleValue';
import {finishedStock} from './finishedStock';
function Metric({label,value,note,onClick,icon}){return <button className="op-home-metric" onClick={onClick}><span className="studio-metric-label"><Icon name={icon} size={17}/>{label}</span><strong>{value}</strong><small>{note} →</small></button>;}
export default function Overview({data,setTab,user,onSearch}){
 const anchor=data.presentationDate||today(),[more,setMore]=useState(false);
 const plan=useMemo(()=>businessPlan(data,anchor),[data,anchor]);
 const saleStock=useMemo(()=>stockSaleValue(data,anchor),[data,anchor]);
 const tasks=[],seen=new Set();
 const wagePending=(data.wageRequests||[]).filter(r=>['submitted','agreed','disputed'].includes(r.status)&&r.type!=='late_production');
 const latePending=(data.wageRequests||[]).filter(r=>r.type==='late_production'&&r.status==='submitted');
 const attendancePending=(data.workDays||[]).filter(d=>d.status==='reported');
 if(wagePending.length&&data.permissions?.payroll!==false)tasks.push({key:'wages',title:'Зарплата · '+wagePending.length,text:wagePending.some(r=>r.status==='disputed')?'Есть возражение — нужно решение владельца':'Согласования ожидают проведения',tone:wagePending.some(r=>r.status==='disputed')?'urgent':'waiting',action:()=>setTab('payroll',{kind:'wage-requests'})});
 if(latePending.length&&data.permissions?.production!==false)tasks.push({key:'late-output',title:'Прошлый выпуск · '+latePending.length,text:'Работник просит записать выработку прошлой датой',tone:'waiting',action:()=>setTab('production')});
 if(attendancePending.length&&data.permissions?.payroll!==false)tasks.push({key:'attendance',title:'Смены · '+attendancePending.length,text:'Проверить отметки сотрудников',tone:'waiting',action:()=>setTab('payroll',{kind:'work-day',userId:attendancePending[0].userId,date:attendancePending[0].date})});
 const orderTask=(rows,title,tone)=>{const o=rows.find(o=>!seen.has(o.id));if(!o)return;seen.add(o.id);tasks.push({key:title,title:title+' · '+rows.length,text:(o.destination?.outletName||o.company)+' · на '+o.deliveryDate,tone,action:()=>setTab('orders',{kind:'order',id:o.id})});};
 if((data.returns||[]).some(r=>r.status==='requested'))tasks.push({key:'returns',title:'Возвраты · '+data.returns.filter(r=>r.status==='requested').length,text:'Принять товар и выбрать решение',tone:'waiting',action:()=>setTab('returns')});
 orderTask(plan.overdue,'Срок прошёл','urgent');
 if(plan.drafts.length){const p=plan.drafts[0],product=data.products.find(x=>x.id===p.productId);tasks.push({key:'draft',title:'Выпуск на проверке · '+plan.drafts.length,text:(product?.name||'Продукция')+' · '+fmt(p.kg)+' кг',tone:'waiting',action:()=>setTab('production',{kind:'check-production',id:p.id})});}
 orderTask(plan.submitted,'Новые заявки','waiting');orderTask(plan.approved,'К отгрузке','ready');
 const materials=[...data.materials].sort((a,b)=>(Number(a.quantity)>0)-(Number(b.quantity)>0)||a.name.localeCompare(b.name,'ru'));
 const products=[...data.products].sort((a,b)=>(finishedStock(b).freeKg||0)-(finishedStock(a).freeKg||0)||a.name.localeCompare(b.name,'ru'));
 const dayOrders=(data.orders||[]).filter(o=>!o._pending&&['submitted','approved'].includes(o.status)&&o.deliveryDate===anchor);
 const dayReady=dayOrders.filter(o=>orderReadiness(o,data.products).ready);
 const dayNeed=dayOrders.filter(o=>!orderReadiness(o,data.products).ready);
 const dayWorkers=new Set((data.productions||[]).filter(p=>p.date===anchor&&['draft','posted'].includes(p.status)&&!p._pending&&p.workerId!=null).map(p=>String(p.workerId)));
 return <>
 <section className="op-home-intro studio-intro"><div><span className="studio-date">{new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(anchor+'T12:00:00Z'))}</span><h2>Мой цех</h2></div></section>
 <button className="ux-home-search" onClick={onSearch}><Icon name="search" size={20}/><span>Товар, сотрудник, магазин, документ…</span></button>
 <div className="cond-quick-actions">{data.permissions?.cash!==false&&<button onClick={()=>setTab('expenses',{kind:'add'})}><span><Icon name="expense"/></span><b>Расход</b></button>}{data.permissions?.materials!==false&&<button onClick={()=>setTab('materials','receipt')}><span><Icon name="materials"/></span><b>Приход сырья</b></button>}{data.permissions?.cash!==false&&data.permissions?.payroll!==false&&<button onClick={()=>setTab('expenses',{kind:'advance'})}><span><Icon name="payroll"/></span><b>Аванс</b></button>}{data.permissions?.cash!==false&&data.permissions?.finance!==false&&<button onClick={()=>setTab('shops',{kind:'receive-payment'})}><span><Icon name="money"/></span><b>Оплата клиента</b></button>}</div>

 {data.isOwner&&<section className="op-card cond-stock-sale"><span className="op-eyebrow">ГОТОВО НА СКЛАДЕ</span><h2>{saleStock.unknown?'Известная сумма · ':''}{moneyFmt(saleStock.total)} ₸</h2><p className="op-muted">{fmt(saleStock.boxes)} коробок · {fmt(saleStock.kg)} кг · по минимальным ценам клиентов</p><small className="op-muted">Включая резерв. Возможная выручка, не прибыль.</small>{saleStock.unknown>0&&<p className="op-plan-context">Без цены: {saleStock.unknown} поз. — в сумму не включены.</p>}<details className="op-help"><summary>По товарам и коробкам · {saleStock.rows.length}</summary>{saleStock.rows.map(r=><button className="op-stock-link" key={r.key} onClick={()=>setTab('catalog',{kind:'product',productId:r.productId})}><span>{r.name}<small>{r.capacityKg?fmt(r.capacityKg)+' кг · ':''}{fmt(r.quantity)} {r.unit==='box'?boxWord(r.quantity):'кг'} · {r.price==null?'Укажите цену':moneyFmt(r.price)+' ₸/'+(r.unit==='box'?'коробку':'кг')}</small></span><b>{r.value==null?'Без цены':moneyFmt(r.value)+' ₸'}</b></button>)}{!saleStock.rows.length&&<Empty>Готового товара на складе нет.</Empty>}</details></section>}
 {tasks.length>0&&<section className="op-card"><div className="op-section-heading"><h2>Требует внимания</h2>{tasks.length>3&&<button className="ghost" onClick={()=>setMore(v=>!v)}>{more?'Свернуть':'Ещё '+(tasks.length-3)}</button>}</div>{!tasks.length?<Empty>Нет заявок и выпусков, требующих действия. Можно записать приход или выпуск на склад.</Empty>:<div className="op-home-task-list">{(more?tasks:tasks.slice(0,3)).map(t=><button key={t.key} className={'op-home-task '+t.tone} onClick={t.action}><span className="op-task-mark" aria-hidden="true">{t.tone==='urgent'?'!':t.tone==='ready'?'✓':'•'}</span><span><b>{t.title}</b><small>{t.text}</small></span><span aria-hidden="true">→</span></button>)}</div>}</section>}
 <section aria-label="Сегодня"><h2>Сегодня</h2><div className="op-home-metrics">
 <Metric icon="orders" label="Заявки на сегодня" value={dayOrders.length} note="Открыть список" onClick={()=>setTab('orders',{kind:'filter',status:'active',due:'today'})}/>
 <Metric icon="truck" label="Готовы к отгрузке" value={dayReady.length} note="Проверить и отгрузить" onClick={()=>setTab('orders',{kind:'filter',status:'ready',due:'today'})}/>
 <Metric icon="production" label="Нужно изготовить" value={dayNeed.length} note="Заявки с недостачей" onClick={()=>setTab('orders',{kind:'filter',status:'need',due:'today'})}/>
 <Metric icon="payroll" label="Сдали выпуск" value={dayWorkers.size} note="Сотрудники и акты" onClick={()=>setTab('production',{kind:'day-overview',date:anchor})}/>
 </div></section>

  {plan.rows.length>0&&<button className="ux-report-link" onClick={()=>setTab('production',{kind:'production-tasks'})}><Icon name="production"/><span><b>План по заявкам</b><small>{plan.rows.filter(p=>p.needKg>0||p.unknown).length} товаров требуют выпуска или уточнения</small></span><Icon name="forward"/></button>}
 <div className="cond-secondary-links">{data.permissions?.inventory!==false&&<button className="ghost" onClick={()=>setTab('inventory')}><Icon name="inventory" size={18}/>Инвентаризация</button>}{data.permissions?.payroll!==false&&<button className="ghost" onClick={()=>setTab('payroll')}><Icon name="payroll" size={18}/>Команда</button>}{data.permissions?.catalog!==false&&<button className="ghost" onClick={()=>setTab('recipes',{kind:'full-cost'})}><Icon name="recipes" size={18}/>Себестоимость</button>}</div>
 {data.permissions?.finance!==false&&<button className="ux-report-link" onClick={()=>setTab('finance')}><Icon name="finance"/><span><b>Деньги и результаты</b><small>Продажи, расходы, долги</small></span><Icon name="forward"/></button>}
 <div className="op-charts-grid"><section className="op-card"><div className="op-section-heading"><h2>Готовые товары</h2><button className="ghost" onClick={()=>setTab('catalog')}>Все →</button></div>{products.slice(0,4).map(p=>{const stock=finishedStock(p);return <button className="op-stock-link" key={p.id} onClick={()=>setTab('catalog',{kind:'product',productId:p.id})}><span>{p.name}{stock.kg>0&&<small>{stock.boxes>0?fmt(stock.boxes)+' '+boxWord(stock.boxes)+(stock.looseKg>0?' · '+fmt(stock.looseKg)+' кг без коробок':''):fmt(stock.kg)+' кг без коробок'}{stock.reservedKg>0?' · резерв '+fmt(stock.reservedKg)+' кг':''}</small>}</span><b>{stock.freeKg===null?'Уточнить':stock.freeKg>0?fmt(stock.freeKg)+' кг':stock.kg>0?'Всё в резерве':stock.kg===null?'Нет свободного':'Нет на складе'}{stock.freeKg>0&&<small>свободно</small>}</b></button>;})}{!products.length&&<Empty>Добавьте первый готовый товар.</Empty>}</section><section className="op-card"><div className="op-section-heading"><h2>Материалы</h2><button className="ghost" onClick={()=>setTab('materials')}>Все →</button></div>{materials.slice(0,4).map(m=><button className="op-stock-link" key={m.id} onClick={()=>setTab('materials',{kind:'search',query:m.name,materialId:m.id})}><span>{m.name}</span><b className={Number(m.quantity)<=0?'op-quantity-zero':''}>{fmt(m.quantity)} {m.unit}</b></button>)}{!materials.length&&<Empty>Добавьте ингредиенты и упаковку.</Empty>}</section></div>
 </>;
}
