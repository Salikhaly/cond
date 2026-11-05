function knownMaterialPrices(materials,receipts=[],documents=[],corrections=[],counts=[]){
 const latest=new Map();for(const c of corrections){const old=latest.get(c.receiptId);if(!old||Number(c.version)>Number(old.version))latest.set(c.receiptId,c);}
 const proofs=documents.flatMap(d=>latest.get(d.id)?.after?.lines||d.lines||[]);
 // Corrected documents supersede physical source rows, including formerly free goods.
 proofs.push(...receipts.filter(r=>!documents.some(d=>d.supplier===r.supplier&&d.document===r.document)));
 const free=new Set(proofs.filter(l=>!l.historical&&Number(l.quantity)>0&&l.unitCost!==null&&l.unitCost!==undefined&&l.unitCost!==''&&Number(l.unitCost)===0).map(l=>String(l.materialId)));
 for(const count of counts.filter(c=>c.status==='posted'))for(const l of count.lines||[])if(l.kind==='material'&&Number(l.delta)>0&&l.surplusCost!==null&&l.surplusCost!==undefined&&l.surplusCost!==''&&Number(l.surplusCost)===0)free.add(String(l.itemId));
 return new Set(materials.filter(m=>m.unitCost!==null&&m.unitCost!==undefined&&m.unitCost!==''&&Number.isFinite(Number(m.unitCost))&&(Number(m.unitCost)>0||Number(m.unitCost)===0&&free.has(String(m.id)))).map(m=>String(m.id)));
}
module.exports={knownMaterialPrices};
