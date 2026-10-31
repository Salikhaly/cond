const round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
function businessPlan(data,anchor){
 const products=data.products||[],recipes=data.recipes||[],materials=data.materials||[],productions=data.productions||[];
 const active=(data.orders||[]).filter(o=>['submitted','approved'].includes(o.status)&&!o._pending);
 const demands=new Map();
 for(const o of active)for(const l of o.lines||[]){const key=String(l.productId);const p=demands.get(key)||{id:key,name:products.find(p=>String(p.id)===key)?.name||l.name||'Товар',orderedKg:0,submittedKg:0,approvedKg:0};p.orderedKg=round(p.orderedKg+Number(l.kg));p[o.status==='approved'?'approvedKg':'submittedKg']=round(p[o.status==='approved'?'approvedKg':'submittedKg']+Number(l.kg));demands.set(key,p);}
 const materialNeeds=new Map();
 const rows=[...demands.values()].map(row=>{
  const p=products.find(p=>String(p.id)===row.id),stockKg=Number(p?.kg)||0;
  const needKg=round(Math.max(0,row.orderedKg-stockKg));
  const drafts=productions.filter(p=>p.status==='draft'&&String(p.productId)===row.id&&!p._pending&&!p._posting);
  const waitingKg=round(drafts.reduce((s,p)=>s+Number(p.kg),0));
  const recipe=recipes.find(r=>String(r.productId)===row.id&&r.active!==false);
  const noRecipe=needKg>0&&(!recipe||Number(recipe.outputKg)<=0);
  // Pending output is shown separately; it never becomes real inventory.
  if(needKg>0&&!noRecipe)for(const l of recipe.lines||[]){const amount=round(Number(l.quantity)*needKg/Number(recipe.outputKg));materialNeeds.set(l.materialId,round((materialNeeds.get(l.materialId)||0)+amount));}
  return {...row,stockKg,needKg,waitingKg,afterCheckKg:round(Math.max(0,needKg-waitingKg)),draftId:drafts[0]?.id,noRecipe};
 }).sort((a,b)=>b.needKg-a.needKg||a.name.localeCompare(b.name,'ru'));
 const shortages=[...materialNeeds].map(([id,required])=>{const m=materials.find(m=>m.id===id),available=Number(m?.quantity)||0;return{id,name:m?.name||'Материал не найден',unit:m?.unit||'',required,available,missing:round(Math.max(0,required-available)),known:Boolean(m)}}).filter(m=>m.missing>0).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const priority=(a,b)=>String(a.deliveryDate||'9999').localeCompare(String(b.deliveryDate||'9999'))||String(a.id).localeCompare(String(b.id));
 const overdue=active.filter(o=>o.deliveryDate&&o.deliveryDate<anchor).sort(priority);
 const submitted=active.filter(o=>o.status==='submitted').sort(priority),approved=active.filter(o=>o.status==='approved').sort(priority);
 const drafts=productions.filter(p=>p.status==='draft'&&!p._pending&&!p._posting).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const emptyMaterials=materials.filter(m=>Number(m.quantity)<=0);
 const missingRecipes=products.filter(p=>!recipes.some(r=>r.productId===p.id&&r.active!==false));
 return{rows,shortages,overdue,submitted,approved,drafts,emptyMaterials,missingRecipes};
}
module.exports={businessPlan};
