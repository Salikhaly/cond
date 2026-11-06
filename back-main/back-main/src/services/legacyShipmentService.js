const M=require('../models/operations'),ApiError=require('../exceptions/ApiError');
const {legacyShipmentPlan,physicalShape}=require('../domain/legacyShipmentPlan');
async function load(productId,stock,t){
 const packs=await M.ProductPack.findAll({where:{productId},transaction:t});
 const stocks=packs.length?await M.PackStock.findAll({where:{packId:packs.map(p=>p.id)},order:[['packId','ASC']],transaction:t,lock:t.LOCK.UPDATE}):[];
 return {stocks,product:{kg:Number(stock.kg),packs:packs.map(p=>({id:p.id,capacityKg:Number(p.capacityKg),boxes:Number(stocks.find(s=>s.packId===p.id)?.boxes||0),reservedBoxes:Number(stocks.find(s=>s.packId===p.id)?.reservedBoxes||0)}))}};
}
async function assertShape(productId,stock,t){const {product}=await load(productId,stock,t);try{physicalShape(product);}catch(e){throw ApiError.badRequest(e.message);}}
async function consume(line,picks,stock,t,options={}){
 const {product,stocks}=await load(line.productId,stock,t);
 let plan;try{plan=legacyShipmentPlan(line,product,picks,options);}catch(e){throw ApiError.badRequest(e.message);}
 if(plan.requiresUnpack)throw ApiError.badRequest('Подтвердите вскрытие коробки: оставшийся вес останется на складе без коробки');
 if(!plan.complete)throw ApiError.badRequest('Укажите коробки для отгрузки. Без коробок доступно '+plan.looseKg+' кг');
 for(const row of plan.picks)await stocks.find(s=>s.packId===row.packId).decrement('boxes',{by:row.boxes,transaction:t});
 return {shipmentPacks:plan.picks,shipmentLooseKg:plan.requiredLooseKg,shipmentOpenedKg:plan.openedRemainderKg};
}
module.exports={consume,assertShape};
