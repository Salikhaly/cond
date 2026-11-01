import React,{useMemo,useState} from 'react';
import {fmt,moneyFmt,today} from './api';
import {Empty} from './Fields';
import {overviewMetrics} from './overviewMetrics';
import {businessPlan} from './businessPlan';
import ProductionPlan from './ProductionPlan';
import OwnerHomeSummary from './OwnerHomeSummary';
import {approvalItems} from './approvals';
import Icon from './Icon';
function since(days,anchor){const date=new Date(anchor+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-days+1);return date.toISOString().slice(0,10);}
function Metric({label,value,note,onClick,icon}){return <button className="op-home-metric" onClick={onClick}><span className="studio-metric-label"><Icon name={icon} size={17}/>{label}</span><strong>{value}</strong><small>{note} →</small></button>;}
export default function Overview({data,setTab,user}){
 const anchor=data.presentationDate||today(),[more,setMore]=useState(false);
 const plan=useMemo(()=>businessPlan(data,anchor),[data,anchor]);
 const m=useMemo(()=>overviewMetrics(data,since(7,anchor),anchor),[data,anchor]);
 const approvals=approvalItems(data,user);
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
 if(plan.missingRecipes.length){const p=plan.missingRecipes[0];tasks.push({key:'recipe',title:'Нужен состав · '+plan.missingRecipes.length,text:p.name+' — выпуск пока не провести',tone:'urgent',action:()=>setTab('catalog',{kind:'recipe',productId:p.id})});}
 if(plan.emptyMaterials.length){const p=plan.emptyMaterials[0];tasks.push({key:'empty',title:'Нет материала · '+plan.emptyMaterials.length,text:plan.emptyMaterials.slice(0,3).map(m=>m.name).join(', '),tone:'urgent',action:()=>setTab('materials',{kind:'receipt',materialId:p.id})});}
 const materials=[...data.materials].sort((a,b)=>(Number(a.quantity)>0)-(Number(b.quantity)>0)||a.name.localeCompare(b.name,'ru'));
 const products=[...data.products].sort((a,b)=>Number(b.kg)-Number(a.kg));
 return <>
 <section className="op-home-intro studio-intro"><div><span className="studio-date">{new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(anchor+'T12:00:00Z'))}</span><h2>Мой цех</h2></div></section>
 <div className="cond-quick-actions">{data.permissions?.cash!==false&&<button onClick={()=>setTab('expenses',{kind:'add'})}><span><Icon name="expense"/></span><b>Расход</b></button>}{data.permissions?.materials!==false&&<button onClick={()=>setTab('materials','receipt')}><span><Icon name="materials"/></span><b>Приход сырья</b></button>}{data.permissions?.production!==false&&<button onClick={()=>setTab('production','add')}><span><Icon name="production"/></span><b>Выпуск</b></button>}{data.permissions?.orders!==false&&<button onClick={()=>setTab('orders')}><span><Icon name="orders"/></span><b>Заявки</b></button>}</div>
 <div className="cond-secondary-links">{data.permissions?.inventory!==false&&<button className="ghost" onClick={()=>setTab('inventory')}><Icon name="inventory" size={18}/>Инвентаризация</button>}{data.permissions?.payroll!==false&&<button className="ghost" onClick={()=>setTab('payroll')}><Icon name="payroll" size={18}/>Команда</button>}{data.permissions?.catalog!==false&&<button className="ghost" onClick={()=>setTab('recipes',{kind:'full-cost'})}><Icon name="recipes" size={18}/>Себестоимость</button>}</div>
 {approvals.length>0&&<button type="button" className="op-approval-strip" onClick={()=>setTab('approvals')}><span className="op-approval-pulse" aria-hidden="true"/><span><b>Подтвердить · {approvals.length}</b><small>{approvals[0].title} · {approvals[0].subtitle}</small></span><Icon name="forward" size={18}/></button>}
 {data.permissions?.finance!==false&&<OwnerHomeSummary data={data} onNavigate={setTab}/>}
 <div className="op-home-metrics"><Metric icon="orders" label="Новые заявки" value={plan.submitted.length} note="Согласовать" onClick={()=>setTab('orders',{kind:'filter',status:'submitted'})}/><Metric icon="truck" label="Ждут отгрузки" value={plan.approved.length} note="Товар в резерве" onClick={()=>setTab('orders',{kind:'filter',status:'approved'})}/><Metric icon="catalog" label="Готовая продукция" value={fmt(m.stockKg)+' кг'} note={'Свободно '+fmt(m.freeKg)+' кг'} onClick={()=>setTab('catalog')}/><Metric icon="materials" label="Материалы" value={moneyFmt(m.materialValue)+' ₸'} note={data.materials.length+' позиций'} onClick={()=>setTab('materials')}/></div>
 <section className="op-card"><div className="op-section-heading"><h2>С чего начать</h2>{tasks.length>2&&<button className="ghost" onClick={()=>setMore(v=>!v)}>{more?'Свернуть':'Ещё '+(tasks.length-2)}</button>}</div>{!tasks.length?<Empty>Нет заявок и выпусков, требующих действия. Можно записать приход или выпуск на склад.</Empty>:<div className="op-home-task-list">{(more?tasks:tasks.slice(0,2)).map(t=><button key={t.key} className={'op-home-task '+t.tone} onClick={t.action}><span className="op-task-mark" aria-hidden="true">{t.tone==='urgent'?'!':t.tone==='ready'?'✓':'•'}</span><span><b>{t.title}</b><small>{t.text}</small></span><span aria-hidden="true">→</span></button>)}</div>}</section>
 <ProductionPlan plan={plan} setTab={setTab}/>
 <div className="op-charts-grid"><section className="op-card"><div className="op-section-heading"><h2>Готовые товары</h2><button className="ghost" onClick={()=>setTab('catalog')}>Все →</button></div>{products.slice(0,4).map(p=><button className="op-stock-link" key={p.id} onClick={()=>setTab('catalog')}><span>{p.name}</span><b>{fmt(p.availableKg)} кг<small>свободно</small></b></button>)}{!products.length&&<Empty>Добавьте первый готовый товар.</Empty>}</section><section className="op-card"><div className="op-section-heading"><h2>Материалы</h2><button className="ghost" onClick={()=>setTab('materials')}>Все →</button></div>{materials.slice(0,4).map(m=><button className="op-stock-link" key={m.id} onClick={()=>setTab('materials')}><span>{m.name}</span><b className={Number(m.quantity)<=0?'op-quantity-zero':''}>{fmt(m.quantity)} {m.unit}</b></button>)}{!materials.length&&<Empty>Добавьте ингредиенты и упаковку.</Empty>}</section></div>
 </>;
}
