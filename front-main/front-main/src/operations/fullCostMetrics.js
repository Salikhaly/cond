const {expenseMetrics}=require('./expenseMetrics'),{financialMetrics}=require('./financialMetrics');
const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
function savedParts(p){
 const snapshot=p.snapshot||{},material=numeric(p.materialCost??snapshot.materialCost),labor=numeric(p.laborCost??snapshot.laborCost),overhead=numeric(p.overheadCost??snapshot.overheadCost),total=numeric(p.totalCost??snapshot.totalCost);
 let packaging=numeric(snapshot.packagingCost);
 if(packaging===null&&Array.isArray(snapshot.packagingLines)&&snapshot.packagingLines.every(l=>numeric(l.cost)!==null))packaging=snapshot.packagingLines.reduce((s,l)=>s+Number(l.cost),0);
 if(packaging===null&&total!==null&&material!==null&&labor!==null&&overhead!==null){const remainder=total-material-labor-overhead;if(remainder>=-.001)packaging=Math.max(0,remainder);}
 // Legacy kg production included all ingredients/packaging in materialCost.
 if(packaging===null&&!p.packId)packaging=0;
 const complete=[material,labor,overhead,packaging].every(n=>n!==null&&n>=0)&&(total===null||Math.abs(total-material-labor-overhead-packaging)<.001);
 return {material:material??0,labor:labor??0,overhead:overhead??0,packaging:packaging??0,complete};
}
function fullCostMetrics(data,from,to,selected={}){
 const monthEnd=m=>{const d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return d.toISOString().slice(0,10);};
 const inside=date=>(!from||date>=from)&&(!to||date<=to),productions=(data.productions||[]).filter(p=>p.status==='posted'&&inside(p.date));
 const kg=productions.reduce((s,p)=>s+Number(p.kg),0),expenses=expenseMetrics(data,from,to),finance=financialMetrics(data,from,to);
 const groups=Object.fromEntries(['electricity','water','business'].map(key=>{const rows=expenses.rows.filter(r=>r.kind==='operating'&&r.costGroup===key);return [key,{amount:rows.reduce((s,r)=>s+Number(r.totalAmount),0)+(key==='business'?finance.payrollOperating+finance.receiptVariance+(data.wageAdjustments||[]).filter(a=>inside(a.date)).reduce((s,a)=>s+Number(a.amount),0):0),records:rows.length+(key==='business'?(data.receiptCorrections||[]).filter(c=>inside(c.date)&&Number(c.operatingDelta)).length+(data.dailyPay||[]).filter(d=>d.status==='posted'&&inside(d.date)).length+(data.repAccruals||[]).filter(a=>inside(monthEnd(a.month))).length+(data.wageAdjustments||[]).filter(a=>inside(a.date)).length:0)}];}));
 const active=Object.keys(groups).filter(key=>selected[key]),amount=active.reduce((s,key)=>s+groups[key].amount,0),missing=active.filter(key=>groups[key].records===0),unknown=selected.business?(expenses.unknown.length+finance.payrollUnallocated.length+finance.payrollPending.length):0;
 const expenseReady=kg>0&&!missing.length&&!unknown,actual=active.length>0,allocatedPerKg=kg?amount/kg:null,by=new Map();
 for(const p of productions){
  const part=savedParts(p),capacity=p.packId?(numeric(p.snapshot?.capacityKg)??(Number(p.boxes)>0?Number(p.kg)/Number(p.boxes):null)):null;
  const key=String(p.productId)+':'+(p.packId||'kg')+':'+(capacity??'');
  const row=by.get(key)||{key,productId:p.productId,packId:p.packId||null,capacityKg:capacity,kg:0,material:0,packaging:0,labor:0,plannedOverhead:0,complete:true};
  row.kg+=Number(p.kg);row.material+=part.material;row.packaging+=part.packaging;row.labor+=part.labor;row.plannedOverhead+=part.overhead;row.complete=row.complete&&part.complete;by.set(key,row);
 }
 const rows=[...by.values()].map(r=>{
  const raw=[...(data.products||[]),...(data.archivedProducts||[])].find(p=>String(p.id)===String(r.productId)),pack=raw?.packs?.find(p=>p.id===r.packId);
  const packKg=r.packId?(r.capacityKg??numeric(pack?.capacityKg)):numeric(raw?.packKg??(data.packagingVariants||[]).find(v=>v.productId===r.productId)?.kgPerPack);
  const base=r.complete?(r.material+r.packaging+r.labor)/r.kg:null,recipeCost=r.complete?(r.material+r.packaging+r.labor+r.plannedOverhead)/r.kg:null;
  const fullCost=actual?(expenseReady&&r.complete?base+allocatedPerKg:null):recipeCost;
  const salePrice=r.packId?(pack?.salePrice==null||!packKg?null:Number(pack.salePrice)/packKg):numeric(raw?.salePrice);
  return {...r,name:raw?.name||'Товар',packKg:packKg||0,salePrice,base,recipeCost,packagingPerKg:r.packaging/r.kg,plannedOverheadPerKg:r.plannedOverhead/r.kg,fullCost,fullPerPack:fullCost==null||!packKg?null:fullCost*packKg};
 }).sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.packKg-b.packKg);
 return {kg,groups,active,amount,allocatedPerKg,missing,unknown,ready:expenseReady&&rows.every(r=>r.complete),actual,rows,unknownCostRows:rows.filter(r=>!r.complete),personal:expenses.personal};
}
module.exports={fullCostMetrics,savedParts};
