const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=v=>Math.round(v*10000)/10000;
// Packs are part of total kilograms, not additional inventory.
function finishedStock(product){
 const packs=product.packs||[],kg=number(product.kg),reservedKg=number(product.reservedKg);
 const boxes=packs.reduce((sum,p)=>sum+(number(p.boxes)||0),0);
 const boxedKg=packs.reduce((sum,p)=>sum+(number(p.boxes)||0)*(number(p.capacityKg)||0),0);
 const freeKg=number(product.availableKg)??(kg!==null&&reservedKg!==null?round(kg-reservedKg):null);
 return {verified:product.stockVerified!==false,kg,boxes,looseKg:kg===null?null:round(Math.max(0,kg-boxedKg)),freeKg,reservedKg};
}
module.exports={finishedStock};
