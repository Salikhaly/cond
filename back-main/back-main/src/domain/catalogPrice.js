// Pure pricing rules shared by the server and both catalogue interfaces.
const money=value=>Math.round((Number(value)+Number.EPSILON)*100)/100;
const valid=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0;
function applicable({rules=[],productId,customerId,outletId,onDate}){
 if(!customerId)return [];
 return rules.filter(r=>Number(r.productId)===Number(productId)&&r.customerId===customerId&&r.startsOn<=onDate&&(!r.outletId||r.outletId===outletId)).sort((a,b)=>String(b.startsOn).localeCompare(String(a.startsOn))||Number(b.revision||0)-Number(a.revision||0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function scoped(rows,outletId){return rows.find(r=>outletId&&r.outletId===outletId)||rows.find(r=>!r.outletId);}
function rateForKg(options){const rule=scoped(applicable(options).filter(r=>!r.packId),options.outletId);return rule&&valid(rule.price)?money(rule.price):valid(options.standardPrice)?money(options.standardPrice):null;}
function priceForPack(options){
 const rows=applicable(options),pack=options.pack;
 const rule=scoped(rows.filter(r=>String(r.packId)===String(pack.id)),options.outletId);
 if(rule&&valid(rule.price))return money(rule.price);
 const kg=scoped(rows.filter(r=>!r.packId),options.outletId);
 if(kg&&valid(kg.price))return money(Number(kg.price)*Number(pack.capacityKg));
 if(valid(pack.salePrice))return money(pack.salePrice);
 return valid(options.standardPrice)?money(Number(options.standardPrice)*Number(pack.capacityKg)):null;
}
module.exports={priceForPack,rateForKg};
