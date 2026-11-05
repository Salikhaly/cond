const {calculationEstimate}=require('./calculationEstimate');
const round=n=>Math.round((n+Number.EPSILON)*10000)/10000;
function productCostSummary(product,data,packId){
 const recipe=(data.recipes||[]).find(r=>String(r.productId)===String(product.id)&&r.active!==false);
 const pack=(product.packs||[]).find(p=>String(p.id)===String(packId))||(product.packs||[])[0];
 const kg=Number(pack?.capacityKg||1),materials=data.materials||[],issues=[];
 if(!recipe?.lines?.length||!(Number(recipe.outputKg)>0))issues.push({kind:'recipe',label:'Добавьте состав товара'});
 const estimate=calculationEstimate({recipe,materials,kg,ratePerKg:0});
 const lines=estimate.lines.map(l=>({...l,kind:'ingredient'}));
 if(pack){
  const box=materials.find(m=>String(m.id)===String(pack.boxMaterialId));
  lines.push({materialId:pack.boxMaterialId,name:box?.name||pack.boxName||'Коробка',quantity:1,unit:'шт',unitCost:box?.unitCost,cost:Math.round(Number(box?.unitCost||0)*100)/100,kind:'packaging'});
  if(Number(pack.filmQtyM)>0){const film=pack.filmMaterialId?materials.find(m=>String(m.id)===String(pack.filmMaterialId)):materials.find(m=>m.kind==='film'&&m.active!==false);lines.push({materialId:film?.id,name:film?.name||'Плёнка',quantity:Number(pack.filmQtyM),unit:'м',unitCost:film?.unitCost,cost:Math.round(Number(film?.unitCost||0)*Number(pack.filmQtyM)*100)/100,kind:'packaging'});}
 }
 for(const line of lines){const material=materials.find(m=>String(m.id)===String(line.materialId));
  if(!material)issues.push({kind:'material',scope:line.kind,materialId:line.materialId,label:'Не найден материал: '+line.name});
  else {
   const zeroReceipt=[...(data.receipts||[]),...(data.receiptDocuments||[]).flatMap(d=>d.lines||[])].some(l=>String(l.materialId)===String(material.id)&&Number(l.quantity)>0&&l.unitCost!=null&&l.unitCost!==''&&Number(l.unitCost)===0);
   if(material.unitCost==null||material.unitCost===''||!Number.isFinite(Number(material.unitCost))||Number(material.unitCost)<0||Number(material.unitCost)===0&&!zeroReceipt)issues.push({kind:'price',materialId:line.materialId,label:'Уточните цену: '+line.name});
  }
  if(!(line.quantity>0))issues.push({kind:'recipe',label:'Укажите расход: '+line.name});
 }
 const ingredients=round(lines.filter(l=>l.kind==='ingredient').reduce((s,l)=>s+l.cost,0));
 const packaging=round(lines.filter(l=>l.kind==='packaging').reduce((s,l)=>s+l.cost,0));
 const labor=pack?Number(pack.laborPerBox||0):Number(product.packKg)>0&&product.packLaborPerPack!=null?Number(product.packLaborPerPack)/Number(product.packKg):Number(product.priceForEmployee||0);
 const overhead=pack?Number(pack.overheadPerBox||0):Number(recipe?.overhead||0)/Number(recipe?.outputKg||1);
 const laborCost=Math.round((labor+Number.EPSILON)*100)/100,overheadCost=pack?Math.round((overhead+Number.EPSILON)*100)/100:round(overhead);
 const total=round(ingredients+packaging+laborCost+overheadCost),salePrice=pack?pack.salePrice:product.salePrice;
 return {pack,kg,recipe,lines,ingredients,packaging,labor:laborCost,overhead:overheadCost,total,costPerKg:round(total/kg),salePrice:salePrice==null?null:Number(salePrice),margin:salePrice==null?null:round(Number(salePrice)-total),issues,complete:issues.length===0};
}
module.exports={productCostSummary};
