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
 return {ready:!unknown&&!missing.length&&demands.size>0,unknown,missing};
}
module.exports={orderReadiness};
