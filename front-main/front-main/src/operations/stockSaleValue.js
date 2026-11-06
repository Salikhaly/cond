const {rateForKg,priceForPack}=require('../../../../back-main/back-main/src/domain/catalogPrice');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function stockSaleValue(data,onDate){
 const customers=(data.customers||[]).filter(c=>c.active!==false),outlets=(data.outlets||[]).filter(o=>o.active!==false),rules=data.clientPrices||[];
 const targets=customers.flatMap(c=>{const shops=outlets.filter(o=>o.customerId===c.id);return shops.length?shops.map(o=>({customerId:c.id,outletId:o.id,priceSource:[c.name,o.name].filter(Boolean).join(' · ')} )):[{customerId:c.id,outletId:null,priceSource:c.name}];});
 const rows=[];
 for(const p of data.products||[]){
  const packs=p.packs||[],boxedKg=packs.reduce((s,b)=>s+Math.max(0,Number(b.boxes)||0)*Number(b.capacityKg),0);
  const add=(pack,quantity)=>{
   if(!(quantity>0))return;
   const options={rules,productId:p.id,onDate,standardPrice:p.salePrice,pack};
   const prices=(targets.length?targets:[{}]).map(target=>({price:pack?priceForPack({...options,...target}):rateForKg({...options,...target}),source:target.priceSource||'Цена каталога'})).filter(v=>v.price!=null&&Number.isFinite(v.price)).sort((a,b)=>a.price-b.price);
   const price=prices.length?prices[0].price:null,priceSource=prices[0]?.source||null;
   rows.push({key:pack?.id||'kg:'+p.id,productId:p.id,name:p.name,capacityKg:pack?.capacityKg||null,quantity,unit:pack?'box':'kg',kg:pack?quantity*Number(pack.capacityKg):quantity,price,priceSource,value:price==null?null:money(price*quantity),reserved:Math.max(0,Number(pack?pack.reservedBoxes:p.reservedKg)||0)});
  };
  for(const pack of packs)add(pack,Math.max(0,Number(pack.boxes)||0));
  add(null,Math.max(0,Math.round((Number(p.kg||0)-boxedKg)*10000)/10000));
 }
 return {rows,total:money(rows.reduce((s,r)=>s+(r.value||0),0)),unknown:rows.filter(r=>r.value==null).length,boxes:rows.filter(r=>r.unit==='box').reduce((s,r)=>s+r.quantity,0),kg:rows.reduce((s,r)=>s+r.kg,0)};
}
module.exports={stockSaleValue};
