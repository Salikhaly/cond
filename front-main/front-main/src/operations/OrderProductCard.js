import React,{useState} from 'react';
import {fmt,moneyFmt} from './api';
import NumericInput from './SafeNumericInput';
import ProductPhoto from './ProductPhoto';

export default function OrderProductCard({items,cart,onChange,onZoom,busy}){
 const [packId,setPackId]=useState(()=>(items.find(i=>Number(cart[i.pack.id])>0)||items.find(i=>i.pack.availableBoxes>0)||items[0]).pack.id);
 const item=items.find(i=>i.pack.id===packId)||items[0],quantity=Number(cart[item.pack.id])||0;
 const selected=items.filter(i=>Number(cart[i.pack.id])>0);
 return <article className="op-catalog-card ux-order-product"><div className="ux-order-product-heading"><ProductPhoto product={item} onOpen={()=>onZoom(item)}/><div><h3>{item.name}</h3><strong className="op-sale-price">{item.price==null?'Цену согласует администратор':moneyFmt(item.price)+' ₸'}</strong><small>за коробку · {fmt(item.pack.capacityKg)} кг</small></div></div>
 <div className="op-catalog-body"><div className="ux-pack-choices" role="group" aria-label={'Фасовка: '+item.name}>{items.map(i=><button key={i.pack.id} type="button" aria-pressed={item.pack.id===i.pack.id} disabled={busy} onClick={()=>setPackId(i.pack.id)}>{fmt(i.pack.capacityKg)} кг</button>)}</div>
 <div className={'op-availability '+(item.pack.availableBoxes>0?'in-stock':'to-make')}>{item.pack.availableBoxes>0?'В наличии '+fmt(item.pack.availableBoxes)+' кор.':'Под производство'}</div>
 <div className="op-quantity"><button type="button" className="secondary" aria-label={'Уменьшить '+item.name} onClick={()=>onChange(item,Math.max(0,quantity-1))} disabled={busy||!quantity}>−</button><NumericInput aria-label={item.name+': коробок'} min="0" step="1" value={cart[item.pack.id]??''} placeholder="0" disabled={busy} onChange={e=>onChange(item,e.target.value)}/><button type="button" className="secondary" aria-label={'Добавить '+item.name} disabled={busy} onClick={()=>onChange(item,quantity+1)}>+</button></div>
 <small className="ux-box-count">Коробок{quantity>0?' · '+fmt(quantity*item.pack.capacityKg)+' кг':''}</small>
 {selected.length>0&&<div className="ux-selected-packs" aria-label={'В заказе: '+item.name}>{selected.map(i=><button key={i.pack.id} type="button" onClick={()=>setPackId(i.pack.id)}>{fmt(i.pack.capacityKg)} кг × {fmt(cart[i.pack.id])}</button>)}</div>}
 </div></article>;
}
