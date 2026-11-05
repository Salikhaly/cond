import React,{useState} from 'react';
import {fmt,moneyFmt} from './api';
import {productCostSummary} from './productCostSummary';
export default function ProductCostView({product,data,onEdit,onBack,onFullCost,onMaterial}){
 const [packId,setPackId]=useState(product.packs?.[0]?.id||'');
 const m=productCostSummary(product,data,packId);
 return <section className="op-card ux-cost-view">
  <button className="ghost" onClick={onBack}>← Назад</button><h2>{product.name}</h2>
  {(product.packs||[]).length>0&&<label className="op-field"><span>Фасовка</span><select value={packId} onChange={e=>setPackId(e.target.value)}>{product.packs.map(p=><option key={p.id} value={p.id}>Коробка {fmt(p.capacityKg)} кг</option>)}</select></label>}
  <div className="ux-cost-total"><span>{m.complete?'Расчётная себестоимость':'Известная часть затрат'}{m.pack?' коробки':' 1 кг'}</span><strong>{moneyFmt(m.total)} ₸</strong><small>{moneyFmt(m.costPerKg)} ₸ за 1 кг</small></div>
  <div className="op-costs"><span>Состав <b>{moneyFmt(m.ingredients)} ₸</b></span><span>Коробка и плёнка <b>{moneyFmt(m.packaging)} ₸</b></span><span>Работа по базовой ставке <b>{moneyFmt(m.labor)} ₸</b></span><span>Другие затраты калькуляции <b>{moneyFmt(m.overhead)} ₸</b></span></div>
  {m.issues.length>0&&<div className="ux-cost-issues">{m.issues.map((issue,i)=><button key={i} className="secondary" onClick={()=>issue.kind==='recipe'||issue.kind==='material'&&issue.scope==='ingredient'||!onMaterial?onEdit():onMaterial(issue)}>{issue.label} →</button>)}</div>}
  {m.salePrice!=null&&<div className="ux-cost-sale"><span>Цена продажи <b>{moneyFmt(m.salePrice)} ₸</b></span>{m.complete&&<span className={m.margin<0?'op-margin-alert':''}>Разница до дополнительных расходов <b>{moneyFmt(m.margin)} ₸</b></span>}</div>}
  <details className="op-help"><summary>Состав на {m.pack?'коробку '+fmt(m.kg)+' кг':'1 кг'}</summary>{m.lines.map((l,i)=><div className="ux-cost-line" key={i}><span>{l.name}<small>{fmt(l.quantity)} {l.unit} × {l.unitCost==null?'цена не задана':moneyFmt(l.unitCost)+' ₸'}</small></span><b>{moneyFmt(l.cost)} ₸</b></div>)}</details>
  <div className="op-actions"><button onClick={onEdit}>{m.recipe?'Изменить состав':'Добавить состав'}</button>{onFullCost&&<button className="secondary" onClick={onFullCost}>Свет, вода и расходы</button>}</div>
  <details className="op-help"><summary>Что входит в расчёт</summary><p>Текущие цены материалов и базовые ставки выбранной коробки. Нулевые цены без подтверждённого прихода требуют проверки. Индивидуальная оплата сотрудника определяется при выпуске. Фактические расходы бизнеса смотрите отдельно; проведённые документы не меняются.</p></details>
 </section>;
}
