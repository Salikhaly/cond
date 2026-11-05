// A repeat is a new purchase, never another payment or posting of the old one.
function repeatReceipt(receipt,materials,date){
 return {supplier:receipt.supplier||'',document:'',date,paid:false,lines:(receipt.lines||[]).map(l=>{
  const material=materials.find(m=>String(m.id)===String(l.materialId));
  if(l.purchasePack){const pack=l.purchasePack,size=Number(pack.size)||0,price=pack.pricePerUnit??(size?Number(pack.price)/size:null);
   return {materialId:l.materialId,inPacks:true,packCount:pack.count,packSize:size?String(size):'',packUnit:pack.unit||material?.packUnit||'коробка',packUnitPrice:price==null?'':String(price)};
  }
  return {materialId:l.materialId,quantity:l.quantity??'',unitCost:l.purchaseUnitCost??l.unitCost??''};
 })};
}
// A replacement never borrows the old material price or changes units silently.
function replaceReceiptMaterial(line,previous,material){
 const base={materialId:material.id,quantity:'',unitCost:''};
 if(!previous||previous.unit!==material.unit)return base;
 if(line.inPacks)return {...base,inPacks:true,packCount:line.packCount??'',packSize:line.packSize??'',packUnit:line.packUnit||material.packUnit||'коробка',packUnitPrice:''};
 return {...base,quantity:line.quantity??''};
}
function newestReceipts(rows){return [...rows].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))||String(b.id||'').localeCompare(String(a.id||'')));}
module.exports={repeatReceipt,replaceReceiptMaterial,newestReceipts};
