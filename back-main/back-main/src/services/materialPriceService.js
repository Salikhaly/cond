const M=require('../models/operations'),{Op,where,cast,col}=require('sequelize'),{knownMaterialPrices}=require('../domain/materialPriceEvidence');
async function known(materials,transaction){
 const missing=materials.filter(m=>m.costComplete===undefined).map(m=>m.materialId||m.id);
 const persisted=missing.length?await M.Material.findAll({where:{id:missing},attributes:['id','costComplete'],raw:true,transaction}):[];
 const values=materials.map(m=>({id:m.materialId||m.id,unitCost:m.unitCost,costComplete:m.costComplete===undefined?persisted.find(p=>p.id===(m.materialId||m.id))?.costComplete:m.costComplete}));
 const ids=values.filter(m=>m.costComplete==null&&Number(m.unitCost)===0).map(m=>m.id);
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
async function backfill(transaction){
 const key='schema:material-cost-quality:v1';if(await M.LegacyLink.findByPk(key,{transaction}))return;
 const history=await require('./receiptCorrectionService').history(transaction),candidates=new Set(history.counts.filter(c=>c.status==='posted').flatMap(c=>c.lines.filter(l=>l.kind==='material'&&(l.unitCost==null||l.costComplete===false||Number(l.delta)>0&&l.surplusCost==null&&Number(l.unitCost)===0)).map(l=>l.itemId))),changes=[];
 for(const id of candidates){const material=await M.Material.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});if(!material||material.costComplete!=null)continue;
  let complete=false,reason='history-incomplete';try{const value=require('../domain/receiptCorrectionMath').replay(require('./receiptCorrectionService').events(history,id));if(Math.abs(value.quantity-Number(material.quantity))<.00011&&Math.abs(value.unitCost-Number(material.unitCost))<.001){complete=value.costComplete;reason=complete?'valued-after-empty':'unvalued-balance';}}catch{}
  await material.update({costComplete:complete},{transaction});changes.push({materialId:id,costComplete:complete,reason});
 }
 await M.LegacyLink.create({id:key,data:{changes,at:new Date().toISOString()}},{transaction});
}
module.exports={known,backfill};
