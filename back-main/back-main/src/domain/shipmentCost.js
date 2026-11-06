// Supplemental events value early shipments without changing the original document.
function shipmentCost(source,events){
 if(!source||source.kind!=='shipment')return source;
 const covers=events.filter(e=>e.kind==='negative-stock-cover'&&e.orderId===source.orderId&&String(e.productId)===String(source.productId));
 return {...(source.toJSON?source.toJSON():source),knownKg:Number(source.knownKg)+covers.reduce((s,e)=>s+Number(e.knownKg),0),value:Number(source.value)+covers.reduce((s,e)=>s+Number(e.value),0)};
}
module.exports={shipmentCost};
