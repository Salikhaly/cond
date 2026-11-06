const round=n=>Math.round(n*10000)/10000;
// One physical count: total kg and its distribution into closed boxes.
// Box corrections classify this mass; they must not adjust it a second time.
function stockReallocation(stock,packs,input){
 const kg=Number(input.kg);
 if(!['number','string'].includes(typeof input.kg)||!String(input.kg).trim()||!Number.isFinite(kg)||kg<0||kg>1e8||Math.abs(kg-round(kg))>1e-8)throw Error('Укажите общий фактический вес');
 if(!Array.isArray(input.packs)||input.packs.length!==packs.length)throw Error('Пересчитайте все фасовки этого товара');
 const seen=new Set(),rows=input.packs.map(row=>{
  const pack=packs.find(p=>String(p.id)===String(row.packId)),boxes=Number(row.boxes);
  if(!pack||seen.has(pack.id)||!['number','string'].includes(typeof row.boxes)||!String(row.boxes).trim()||!Number.isSafeInteger(boxes)||boxes<0||boxes>1e8)throw Error('Укажите целое количество каждой коробки');
  seen.add(pack.id);
  if(boxes<Number(pack.reservedBoxes||0))throw Error('Коробок меньше резерва. Сначала пересогласуйте заявки');
  return {packId:pack.id,capacityKg:Number(pack.capacityKg),beforeBoxes:Number(pack.boxes),boxes,deltaBoxes:boxes-Number(pack.boxes)};
 });
 const boxedKg=round(rows.reduce((s,p)=>s+p.boxes*p.capacityKg,0));
 if(boxedKg>kg+.00011)throw Error('Вес коробок больше общего веса. Проверьте введённый факт');
 if(kg<Number(stock.reservedKg||0)-.00011)throw Error('Общий вес меньше резерва. Сначала пересогласуйте заявки');
 return {beforeKg:Number(stock.kg),kg,deltaKg:round(kg-Number(stock.kg)),boxedKg,looseKg:round(Math.max(0,kg-boxedKg)),packs:rows};
}
module.exports={stockReallocation};
