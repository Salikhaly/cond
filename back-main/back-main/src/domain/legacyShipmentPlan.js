const round=n=>Math.round(n*10000)/10000;
function physicalShape(product){
 const kg=Number(product.kg),packs=product.packs||[];
 if(product.kg==null||!Number.isFinite(kg))throw Error('Обновите остаток товара перед отгрузкой');
 const boxedKg=round(packs.reduce((sum,p)=>sum+Number(p.boxes||0)*Number(p.capacityKg),0));
 if(boxedKg>kg+.00011)throw Error('Вес коробок больше остатка товара. Проведите инвентаризацию коробок и веса');
 return {boxedKg,looseKg:round(Math.max(0,kg-boxedKg))};
}
// A legacy kg line keeps its commercial unit. Fulfilment records actual boxes separately.
function legacyShipmentPlan(line,product,picks=[],options={}){
 if(!Array.isArray(picks)||picks.length>100)throw Error('Проверьте выбранные коробки');
 const packs=product.packs||[],seen=new Set(),rows=[];
 for(const raw of picks){
  const pack=packs.find(p=>String(p.id).toLowerCase()===String(raw?.packId).toLowerCase());
  const boxes=Number(raw?.boxes);
  if(!pack||seen.has(pack.id)||!['number','string'].includes(typeof raw?.boxes)||!String(raw.boxes).trim()||!Number.isSafeInteger(boxes)||boxes<=0)throw Error('Выберите фасовку и целое число коробок');
  if(!options.allowNegative&&boxes>Number(pack.boxes)-Number(pack.reservedBoxes||0))throw Error('Не хватает свободных коробок по '+pack.capacityKg+' кг');
  seen.add(pack.id);rows.push({packId:pack.id,boxes,capacityKg:Number(pack.capacityKg)});
 }
 const {looseKg}=options.allowNegative?{looseKg:Math.max(0,Number(product.kg)-packs.reduce((s,p)=>s+Number(p.boxes||0)*Number(p.capacityKg),0))}:physicalShape(product);
 const kg=Number(product.kg),required=Number(line.kg);
 if(!Number.isFinite(kg)||!Number.isFinite(required)||required<=0)throw Error('Обновите остаток товара перед отгрузкой');
 const selectedKg=round(rows.reduce((sum,p)=>sum+p.boxes*p.capacityKg,0));
 const openedRemainderKg=round(Math.max(0,selectedKg-required)),requiresUnpack=openedRemainderKg>.00011&&options.unpack!==true;
 const requiredLooseKg=round(Math.max(0,required-selectedKg)),missingLooseKg=round(Math.max(0,requiredLooseKg-looseKg));
 return {picks:rows,looseKg,selectedKg,requiredLooseKg,missingLooseKg,openedRemainderKg,requiresUnpack,complete:!requiresUnpack&&(options.allowNegative||missingLooseKg<=.00011)};
}
module.exports={legacyShipmentPlan,physicalShape};
