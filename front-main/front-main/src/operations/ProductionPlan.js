import React,{useState} from 'react';
import {fmt} from './api';
import {boxWord} from './boxWord';
export default function ProductionPlan({plan,setTab}){
 const [expanded,setExpanded]=useState(false);
 if(!plan.rows.length)return null;
 return <section className="op-card">
  <div className="op-section-heading"><h2>Что изготовить</h2><button className="ghost" onClick={()=>setTab('orders')}>Заявки →</button></div>
  <div className="op-plan-list">{(expanded?plan.rows:plan.rows.slice(0,4)).map(p=><article className="op-plan-row" key={p.id}>
   <div className="op-plan-title"><b>{p.name}</b><strong className={p.needKg>0||p.unknown?'op-plan-need':'op-plan-enough'}>{p.unknown?'Уточнить фасовку':p.needKg>0?'Не хватает '+fmt(p.needKg)+' кг':'Есть нужные коробки'}</strong></div>
   {(p.packs||[]).map(pack=><div className="op-plan-pack" key={pack.packId}>
    <b>{pack.capacityKg?fmt(pack.capacityKg)+' кг':'Размер неизвестен'}</b>
    <p>Заказано {fmt(pack.orderedBoxes)} · на складе {fmt(pack.stockBoxes)}</p>
    {pack.needBoxes>0&&<strong className="op-plan-need">Не хватает {fmt(pack.needBoxes)} {boxWord(pack.needBoxes)}</strong>}
    {pack.waitingBoxes>0&&<p className="op-plan-waiting">На проверке {fmt(pack.waitingBoxes)} {boxWord(pack.waitingBoxes)} · после проверки останется {fmt(pack.afterCheckBoxes)}</p>}
    <div className="op-actions">{pack.draftId&&<button className="secondary" onClick={()=>setTab('production',{kind:'check-production',id:pack.draftId})}>Проверить выпуск</button>}
    {!p.noRecipe&&!pack.unknown&&pack.afterCheckBoxes>0&&<button className="secondary" onClick={()=>setTab('production',{kind:'record-production',productId:Number(p.id),packId:pack.packId,needKg:pack.afterCheckBoxes*pack.capacityKg})}>Записать выпуск · {fmt(pack.capacityKg)} кг</button>}</div>
   </div>)}
   {p.legacyKg>0&&<p>Заявки в кг: {fmt(p.legacyKg)} · не хватает {fmt(p.legacyNeedKg)} кг</p>}
   {p.noRecipe&&<button className="secondary" onClick={()=>setTab('catalog',{kind:'recipe',productId:Number(p.id)})}>Добавить состав</button>}
   {p.unknown&&<button className="secondary" onClick={()=>setTab('catalog',{kind:'product',productId:Number(p.id)})}>Проверить фасовки товара</button>}
   {p.legacyNeedKg>0&&!p.noRecipe&&<button className="secondary" onClick={()=>setTab('production',{kind:'record-production',productId:Number(p.id)})}>Записать фактический выпуск</button>}
  </article>)}</div>
  {plan.rows.length>4&&<button className="ghost" onClick={()=>setExpanded(v=>!v)}>{expanded?'Свернуть':'Ещё товаров: '+(plan.rows.length-4)}</button>}
  {plan.shortages.length>0&&<div className="op-plan-buy"><h3>Нужно сырьё</h3>{plan.shortages.map(m=><div className="op-plan-buy-row" key={m.id}><span><b>{m.name}</b><small>Не хватает {fmt(m.missing)} {m.unit}</small></span>{m.known&&<button className="secondary" onClick={()=>setTab('materials',{kind:'receipt',materialId:m.id,missing:m.missing,unit:m.unit})}>Приход →</button>}</div>)}</div>}
  <details className="op-help"><summary>Как считается</summary><p>Новые и согласованные заявки сравниваются с физическим остатком каждой фасовки, включая резерв. Коробки другого размера не заменяют нужные. Выпуск на проверке ещё не является складом. Каждая новая заявка требует проверки резерва при согласовании.</p></details>
 </section>;
}
