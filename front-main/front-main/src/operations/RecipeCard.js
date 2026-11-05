import React from 'react';
import ProductPhoto from './ProductPhoto';
import Icon from './Icon';
import {fmt,moneyFmt} from './api';
import {productCostSummary} from './productCostSummary';
export default function RecipeCard({product,data,onOpen}){
 const m=productCostSummary(product,data);
 return <button className="suite-recipe" onClick={onOpen}>
 <div className="suite-recipe-title"><ProductPhoto product={product}/><span><b>{product.name}</b><small>{m.pack?'Коробка '+fmt(m.kg)+' кг':'На 1 кг'}</small></span><Icon name="forward" size={17}/></div>
 <div className="suite-recipe-cost"><span>{m.complete?'Себестоимость':'Известная часть затрат'}</span><strong>{moneyFmt(m.total)} ₸</strong></div>
 <small>{moneyFmt(m.costPerKg)} ₸ / кг{m.issues.length>0?' · нужно уточнить '+m.issues.length:''}</small>
 </button>;
}
