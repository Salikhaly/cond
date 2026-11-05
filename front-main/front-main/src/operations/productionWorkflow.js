function productionPreviewBody(record){
 return {productId:record.productId,...(record.packId?{packId:record.packId,boxes:record.boxes}:{kg:record.kg}),workerId:record.workerId,date:record.date};
}
function receiptForProduction(record,line,origin={}){
 return {kind:'receipt',materialId:line.materialId,missing:Math.max(0,Math.round((Number(line.quantity)-Number(line.balance))*10000)/10000),unit:line.unit,returnTo:{section:'production',label:'К проверке выпуска',action:{kind:'check-production',id:record.id,...(origin?.returnDay?{returnDay:origin.returnDay}:{}),...(origin?.returnReport?{returnReport:origin.returnReport}:{})}}};
}
function confirmedReturn(action,result){
 return result&&!result.pending&&action?.returnTo?.section?action.returnTo:null;
}
module.exports={productionPreviewBody,receiptForProduction,confirmedReturn};
