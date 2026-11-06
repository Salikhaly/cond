import React from 'react';
import {Field} from './Fields';
import {fmt} from './api';
import {legacyShipmentPlan} from '../../../../back-main/back-main/src/domain/legacyShipmentPlan';
export function shipmentStatus(line,product,picks,unpack=false){try{return legacyShipmentPlan(line,product||{},picks||[],{unpack,allowNegative:product?.allowNegativeStock===true});}catch(e){return {complete:false,error:e.message};}}
export default function LegacyShipmentPicker({line,product,value=[],onChange,unpack=false,onUnpackChange}){
 const plan=shipmentStatus(line,product,value,unpack),packs=(product?.packs||[]).filter(p=>product?.allowNegativeStock||Number(p.boxes)>Number(p.reservedBoxes||0)||value.some(v=>v.packId===p.id));
 if(plan.complete&&!packs.length)return null;
 return <section className="cond-legacy-picks"><h4>{line.name} · отгрузить {fmt(line.kg)} кг</h4>{plan.error?<p role="alert">{plan.error}</p>:<p className="op-muted">Без коробок: {fmt(plan.looseKg)} кг{plan.selectedKg>0?' · выбрано в коробках '+fmt(plan.selectedKg)+' кг':''}</p>}{packs.map(p=><Field key={p.id} label={'Коробки по '+fmt(p.capacityKg)+' кг'} type="number" min="0" max={product?.allowNegativeStock?undefined:Math.max(0,Number(p.boxes)-Number(p.reservedBoxes||0))} step="1" value={value.find(v=>v.packId===p.id)?.boxes??''} onChange={e=>{const other=value.filter(v=>v.packId!==p.id);onChange(e.target.value===''||Number(e.target.value)===0?other:[...other,{packId:p.id,boxes:e.target.value}]);}}/>)}{plan.openedRemainderKg>0&&<label className="op-check"><input type="checkbox" checked={unpack} onChange={e=>onUnpackChange?.(e.target.checked)}/>Открыть коробки · {fmt(plan.openedRemainderKg)} кг оставить на складе без коробки</label>}{!plan.error&&!plan.complete&&<p role="status">{plan.requiresUnpack?'Подтвердите вскрытие коробок.':'Выберите коробки ещё на '+fmt(plan.missingLooseKg)+' кг.'}</p>}</section>;
}
