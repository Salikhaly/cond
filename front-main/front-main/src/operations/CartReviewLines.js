import React from 'react';
import ProductPhoto from './ProductPhoto';
import {fmt,moneyFmt} from './api';
export default function CartReviewLines({rows,products,onRemove}){
 return <ul className="studio-cart-lines" aria-label="Товары в заявке">{rows.map(row=><li key={row.productId}><ProductPhoto product={products.find(p=>p.id===row.productId)||{name:row.name}}/><div className="studio-cart-line-body"><div><h3>{row.name}</h3><strong>{row.total===null?'—':moneyFmt(row.total)+' ₸'}</strong></div><p>{fmt(row.kg)} кг <span>×</span> {row.price===null?<span className="op-missing">Цена не указана</span>:moneyFmt(row.price)+' ₸ / кг'}</p><button type="button" className="ghost" aria-label={'Убрать '+row.name} onClick={()=>onRemove(row.productId)}>Убрать</button></div></li>)}</ul>;
}
