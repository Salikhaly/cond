const M=require('../models/operations'),{Op,where,cast,col}=require('sequelize'),{knownMaterialPrices}=require('../domain/materialPriceEvidence');
async function known(materials,transaction){
 const ids=[...new Set(materials.filter(m=>Number(m.unitCost)===0).map(m=>m.materialId||m.id))];
 const values=materials.map(m=>({id:m.materialId||m.id,unitCost:m.unitCost}));
 if(!ids.length)return knownMaterialPrices(values);
 const [receipts,original,changed,counts]=await Promise.all([
  M.Receipt.findAll({where:{materialId:ids,unitCost:0},raw:true,transaction}),
  M.ReceiptDocument.findAll({where:{[Op.or]:ids.map(materialId=>where(cast(col('lines'),'jsonb'),{[Op.contains]:cast(JSON.stringify([{materialId}]),'jsonb')}))},raw:true,transaction}),
  M.ReceiptCorrection.findAll({where:{[Op.or]:ids.map(materialId=>where(cast(col('after'),'jsonb'),{[Op.contains]:cast(JSON.stringify({lines:[{materialId}]}),'jsonb')}))},attributes:['receiptId'],raw:true,transaction}),
  M.StockCount.findAll({where:{status:'posted',[Op.or]:ids.map(itemId=>where(cast(col('lines'),'jsonb'),{[Op.contains]:cast(JSON.stringify([{kind:'material',itemId}]),'jsonb')}))},raw:true,transaction})
 ]);
 const documentIds=[...new Set([...original.map(d=>d.id),...changed.map(c=>c.receiptId)])];
 const [documents,corrections]=documentIds.length?await Promise.all([M.ReceiptDocument.findAll({where:{id:documentIds},raw:true,transaction}),M.ReceiptCorrection.findAll({where:{receiptId:documentIds},raw:true,transaction})]):[[],[]];
 return knownMaterialPrices(values,receipts,documents,corrections,counts);
}
module.exports={known};
