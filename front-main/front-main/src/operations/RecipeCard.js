import React from 'react';
import ProductPhoto from './ProductPhoto';
import Icon from './Icon';
import {fmt,moneyFmt} from './api';
import {calculationEstimate} from './calculationEstimate';
export default function RecipeCard({product,data,onOpen}){
 const recipe=data.recipes.find(r=>r.productId===product.id),complete=recipe&&recipe.lines.length>0&&recipe.lines.every(l=>data.materials.some(m=>m.id===l.materialId));
 const cost=complete?calculationEstimate({recipe,materials:data.materials,packKg:product.packKg,laborPerPack:product.packLaborPerPack,ratePerKg:product.priceForEmployee,kg:recipe.outputKg}):null;
 return <button className="suite-recipe" onClick={onOpen}><div className="suite-recipe-title"><ProductPhoto product={product}/><span><b>{product.name}</b><small>{recipe?'Рецепт на '+fmt(recipe.outputKg)+' кг':'Состав ещё не добавлен'}</small></span><Icon name="forward" size={17}/></div><div className="suite-recipe-cost"><span>Себестоимость 1 кг</span><strong>{cost?moneyFmt(cost.costPerKg)+' ₸':recipe?'Проверьте состав':'Добавить состав'}</strong></div>{cost&&<div className="suite-recipe-breakdown"><span><i className="material"/>Сырьё <b>{moneyFmt(cost.materialCost/cost.kg)} ₸</b></span><span><i className="labor"/>Работа <b>{moneyFmt(cost.laborCost/cost.kg)} ₸</b></span><span><i className="other"/>Прочее <b>{moneyFmt(cost.overheadCost/cost.kg)} ₸</b></span></div>}</button>;
}
