const ApiError=require('../exceptions/ApiError'),money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100,round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
module.exports=(lines,b)=>{
 const charges=b.extraCosts||[];if(!Array.isArray(charges)||charges.length>20)throw ApiError.badRequest('Проверьте дополнительные закупочные затраты');
 const normalized=charges.map(c=>{const value=Number(c.amount);if(!['string','number'].includes(typeof c.amount)||!Number.isFinite(value)||value<=0||value>99999999.99||Math.abs(value-money(value))>1e-8||typeof c.name!=='string'||!c.name.trim()||c.name.length>250)throw ApiError.badRequest('Укажите название и сумму дополнительных затрат');return {name:c.name.trim(),amount:money(value)};});
 if(b.comment!=null&&(typeof b.comment!=='string'||b.comment.length>2000))throw ApiError.badRequest('Комментарий — до 2000 символов');
 const total=money(normalized.reduce((s,c)=>s+c.amount,0)),base=lines.reduce((s,l)=>s+l.lineTotal,0);let weight=0,allocated=0;
 if(total>0)for(const [index,l] of lines.entries()){
  weight+=base>0?l.lineTotal/base:1/lines.length;const cumulative=index===lines.length-1?total:money(total*weight),extra=money(cumulative-allocated);allocated=cumulative;
  l.goodsTotal=l.lineTotal;l.purchaseUnitCost=l.unitCost;l.additionalCost=extra;l.lineTotal=money(l.lineTotal+extra);l.unitCost=round(l.lineTotal/l.quantity);
 }
 return {charges:normalized,total,comment:b.comment||''};
};
