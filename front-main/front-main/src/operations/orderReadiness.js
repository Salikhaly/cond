// Readiness is a preview. Only the server can reserve stock during approval.
function orderReadiness(order,products=[]){
 if(order._pending)return {ready:false,unknown:true,missing:[]};
 if(order.status==='approved')return {ready:true,unknown:false,missing:[]};
 if(order.status!=='submitted')return {ready:false,unknown:false,missing:[]};
 const demands=new Map();
 for(const line of order.lines||[]){
  const key=String(line.productId)+':'+(line.packId||'kg');
  const previous=demands.get(key);
  demands.set(key,{...line,boxes:Number(line.boxes||0)+Number(previous?.boxes||0),kg:Number(line.kg||0)+Number(previous?.kg||0)});
 }
 let unknown=false;
 const missing=[];
 for(const line of demands.values()){
  const product=products.find(p=>String(p.id)===String(line.productId));
  const pack=line.packId?product?.packs?.find(p=>String(p.id)===String(line.packId)):null;
  const available=line.packId?pack?.availableBoxes:product?.availableKg;
  if(!product||(line.packId&&!pack)||available==null||!Number.isFinite(Number(available))){unknown=true;missing.push({...line,unknown:true,missing:null});continue;}
  const amount=line.packId?line.boxes:line.kg;
  const shortage=Math.max(0,amount-Number(available));
  if(shortage>0)missing.push({...line,capacityKg:pack?.capacityKg,missing:shortage});
 }
 // Different pack sizes and legacy kilogram lines share the same total stock.
 // Per-pack checks alone can reuse kilograms already reserved by a legacy order.
 const totals=new Map();
 for(const line of demands.values()){
  const product=products.find(p=>String(p.id)===String(line.productId));
  const pack=line.packId?product?.packs?.find(p=>String(p.id)===String(line.packId)):null;
  const kg=line.packId?Number(line.boxes)*Number(pack?.capacityKg):Number(line.kg);
  const key=String(line.productId),total=totals.get(key)||{product,line,kg:0};
  if(Number.isFinite(kg))total.kg+=kg;
  totals.set(key,total);
 }
 for(const {product,line,kg} of totals.values()){
  const free=product?.availableKg;
  if(free==null||!Number.isFinite(Number(free))){
   unknown=true;
   if(!missing.some(m=>String(m.productId)===String(line.productId)&&m.unknown))missing.push({...line,packId:null,unknown:true,missing:null});
   continue;
  }
  const alreadyMissing=missing.filter(m=>String(m.productId)===String(line.productId)).reduce((sum,m)=>sum+(m.unknown?0:Number(m.missing)*(m.packId?Number(m.capacityKg):1)),0);
  const extra=Math.round(Math.max(0,kg-Number(free)-alreadyMissing)*10000)/10000;
  if(extra>0){const legacy=missing.find(m=>String(m.productId)===String(line.productId)&&!m.packId&&!m.unknown);if(legacy){legacy.missing=Math.round((legacy.missing+extra)*10000)/10000;legacy.sharedStock=true;}else missing.push({...line,name:product?.name||line.name,packId:null,capacityKg:null,missing:extra,sharedStock:true});}
 }
 return {ready:!unknown&&!missing.length&&demands.size>0,unknown,missing};
}
function canApproveOrder(order,products=[]){
 const readiness=orderReadiness(order,products);
 return order.status==='submitted'&&!order._pending&&!readiness.unknown&&(order.lines||[]).length>0&&(readiness.ready||order.lines.every(l=>products.find(p=>String(p.id)===String(l.productId))?.allowNegativeStock===true));
}
module.exports={orderReadiness,canApproveOrder};
