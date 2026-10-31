const {day}=require('./overviewMetrics');
const {returnSales}=require('./returnMetrics');
const n=v=>Number(v)||0;
function marginMetrics(data,from='',to=''){
 const within=v=>{const d=day(v);return d&&(!from||d>=from)&&(!to||d<=to);};
 const events=data.costEvents||[],products=[...(data.products||[]),...(data.archivedProducts||[])];
 const sales=[...(data.incomes||[]),...returnSales(data)].filter(s=>within(s.date));
 const rows=sales.map(s=>{
  const e=events.find(e=>e.id===(s.isReturn?`return:${s.returnId}:${s.productId}`:`shipment:${s.orderId}:${s.productId}`));
  const kg=Math.abs(n(s.totalWeight)),knownKg=Math.min(kg,n(e?.knownKg)),sign=s.isReturn?-1:1;
  return {id:s.id,date:day(s.date),name:s.product?.name||products.find(p=>String(p.id)===String(s.productId))?.name||'Товар',client:s.destination?.outletName||s.business_relation?.name||'Клиент',productId:s.productId,kg:sign*kg,revenue:n(s.totalAmount),knownCost:sign*n(e?.value),unknownKg:Math.max(0,kg-knownKg),complete:!!e&&kg-knownKg<.00011,orderId:s.orderId||null,isReturn:!!s.isReturn};
 });
 const complete=rows.every(r=>r.complete),revenue=rows.reduce((s,r)=>s+r.revenue,0),knownCost=rows.reduce((s,r)=>s+r.knownCost,0),unknownKg=rows.reduce((s,r)=>s+r.unknownKg,0);
 const scraps=events.filter(e=>e.kind==='return-scrap'&&within(e.date));
 // Old dispositions are still visible as unknown, rather than disappearing on migration.
 for(const r of data.returns||[])if(r.status==='posted')for(const d of r.dispositions||[])if(d.kind==='scrap'&&within(d.createdAt)&&!events.some(e=>e.id==='disposition:'+d.id))scraps.push({kg:d.kg,knownKg:0,value:0});
 const scrapComplete=scraps.every(e=>n(e.kg)-n(e.knownKg)<.00011),scrapCost=scraps.reduce((s,e)=>s+n(e.value),0);
 const groups=new Map();for(const r of rows){const p=groups.get(r.productId)||{id:r.productId,name:r.name,revenue:0,knownCost:0,complete:true};p.revenue+=r.revenue;p.knownCost+=r.knownCost;p.complete=p.complete&&r.complete;groups.set(p.id,p);}
 const ranked=[...groups.values()].map(p=>({...p,margin:p.complete?p.revenue-p.knownCost:null})).sort((a,b)=>(b.margin??-Infinity)-(a.margin??-Infinity));
 const stock=(data.stockValues||[]).map(s=>({...s,unknownKg:Math.max(0,n(s.kg)-n(s.knownKg)),name:products.find(p=>String(p.id)===String(s.productId))?.name||'Товар'}));
 const held=[];for(const r of data.returns||[])if(r.status==='posted')for(const l of r.lines||[]){const kg=Math.max(0,n(l.kg)-(r.dispositions||[]).filter(d=>d.productId===l.productId).reduce((s,d)=>s+n(d.kg),0));if(kg>.0001){const source=events.find(e=>e.id===`return:${r.id}:${l.productId}`);held.push({kg,knownValue:source?n(source.value)*kg/n(source.kg):0,unknownKg:source?kg*(1-n(source.knownKg)/n(source.kg)):kg});}}
 return {rows,revenue,knownCost,unknownKg,unknownRows:rows.filter(r=>!r.complete).length,complete,margin:complete?revenue-knownCost:null,rate:complete&&revenue>0?(revenue-knownCost)/revenue*100:null,scrapCost,scrapComplete,afterScrap:complete&&scrapComplete?revenue-knownCost-scrapCost:null,ranked,stock,stockKnownValue:stock.reduce((s,p)=>s+n(p.value),0),stockUnknownKg:stock.reduce((s,p)=>s+p.unknownKg,0),heldKg:held.reduce((s,p)=>s+p.kg,0),heldValue:held.reduce((s,p)=>s+p.knownValue,0),heldUnknownKg:held.reduce((s,p)=>s+p.unknownKg,0)};
}
module.exports={marginMetrics};
