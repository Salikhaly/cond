const round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
function replay(events){
 let quantity=0,unitCost=0;
 for(const e of [...events].sort((a,b)=>a.time-b.time||a.order-b.order||String(a.id).localeCompare(String(b.id)))){
  if(e.kind==='receipt'){
   const next=round(quantity+e.quantity);if(next>0)unitCost=round((quantity*unitCost+e.value)/next);quantity=next;
  }else if(e.kind==='consume'){
   if(e.quantity>quantity+.00011)throw Error('Недостаточно истории прихода перед выпуском: '+e.id);quantity=round(quantity-e.quantity);
  }else if(e.kind==='count'){
   const delta=round(e.actual-quantity),cost=e.surplusCost==null?unitCost:e.surplusCost;if(delta>0&&e.actual>0)unitCost=round((quantity*unitCost+delta*cost)/e.actual);quantity=e.actual;
  }
  if(quantity<-.00011||!Number.isFinite(quantity)||!Number.isFinite(unitCost))throw Error('Не удалось сверить историю материала');
 }
 return {quantity,unitCost,value:round(quantity*unitCost)};
}
module.exports={replay};
