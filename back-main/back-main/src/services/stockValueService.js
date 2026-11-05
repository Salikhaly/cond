const M = require('../models/operations');
const ApiError = require('../exceptions/ApiError');
const round = n => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Qyzylorda'}).format(new Date());
const plain = row => row.get ? row.get({plain:true}) : row;

// Call while holding Product then Stock row locks, before changing physical kg.
async function pool(stock, t) {
  const [row,created] = await M.StockValue.findOrCreate({where:{productId:stock.productId},defaults:{kg:stock.kg,knownKg:0,value:0},transaction:t});
  if(created)await M.CostEvent.create({id:'opening:'+stock.productId,productId:stock.productId,kind:'opening',kg:stock.kg,knownKg:0,value:0,date:today()},{transaction:t});
  await row.reload({transaction:t,lock:t.LOCK.UPDATE});
  if (Math.abs(Number(row.kg)-Number(stock.kg)) > .00011) throw new ApiError(409,'Стоимость склада не сходится с количеством. Нужна сверка');
  return row;
}
function part(source, kg) {
  const total=Number(source.kg);
  if (!total || kg < 0 || kg > total+.00001) throw ApiError.badRequest('Некорректное количество для оценки');
  return {kg:round(kg),knownKg:round(Number(source.knownKg)*kg/total),value:round(Number(source.value)*kg/total)};
}
async function movement(stock, amount, incoming, event, t) {
  const row=await pool(stock,t), sign=incoming?1:-1;
  await M.CostEvent.create({...event,productId:stock.productId,...amount,date:event.date||today()},{transaction:t});
  const next={kg:round(Number(row.kg)+sign*amount.kg),knownKg:round(Number(row.knownKg)+sign*amount.knownKg),value:round(Number(row.value)+sign*amount.value)};
  if(next.kg<-.00001||next.knownKg<-.00011||next.value<-.00011||next.knownKg>next.kg+.00011)throw new ApiError(409,'Не согласована оценка остатка');
  if(next.kg===0){next.knownKg=0;next.value=0;}
  await row.update(next,{transaction:t});
  return amount;
}
async function production(stock,p,calc,t){
  return movement(stock,{kg:Number(p.kg),knownKg:calc.costComplete===false?0:Number(p.kg),value:Number(calc.totalCost)},true,{id:'production:'+p.id,kind:'production',date:p.date},t);
}
async function shipment(stock,orderId,kg,t){
  const row=await pool(stock,t);
  return movement(stock,part(row,kg),false,{id:`shipment:${orderId}:${stock.productId}`,kind:'shipment',orderId},t);
}
async function acceptReturn(r,t){
  for(const line of r.lines){
    const source=await M.CostEvent.findByPk(`shipment:${r.orderId}:${line.productId}`,{transaction:t});
    // Never reconstruct old shipment costs from today's recipe or priceTotal.
    const previous=await M.CostEvent.findAll({where:{orderId:r.orderId,productId:line.productId,kind:'return-accepted'},transaction:t});
    const consumed=previous.reduce((s,e)=>({kg:s.kg+Number(e.kg),knownKg:s.knownKg+Number(e.knownKg),value:s.value+Number(e.value)}),{kg:0,knownKg:0,value:0});
    const cumulative=source?part(source,round(consumed.kg+Number(line.kg))):{knownKg:0,value:0};
    await M.CostEvent.create({id:`return:${r.id}:${line.productId}`,kind:'return-accepted',returnId:r.id,orderId:r.orderId,productId:line.productId,kg:line.kg,knownKg:round(cumulative.knownKg-consumed.knownKg),value:round(cumulative.value-consumed.value),date:today()},{transaction:t});
  }
}
async function disposition(stock,r,d,t){
  const source=await M.CostEvent.findByPk(`return:${r.id}:${d.productId}`,{transaction:t});
  const prior=await M.CostEvent.findAll({where:{returnId:r.id,productId:d.productId,kind:['return-sale','return-scrap']},transaction:t});
  const used=prior.reduce((s,e)=>({kg:s.kg+Number(e.kg),knownKg:s.knownKg+Number(e.knownKg),value:s.value+Number(e.value)}),{kg:0,knownKg:0,value:0});
  const cumulative=source?part(source,round(used.kg+Number(d.kg))):{knownKg:0,value:0};
  const amount={kg:Number(d.kg),knownKg:round(cumulative.knownKg-used.knownKg),value:round(cumulative.value-used.value)};
  const event={id:'disposition:'+d.id,kind:'return-'+d.kind,orderId:r.orderId,returnId:r.id,productId:d.productId,date:today()};
  if(d.kind==='sale')return movement(stock,amount,true,event,t);
  await M.CostEvent.create({...event,...amount},{transaction:t});
}
async function readData(t){
  const events=await M.CostEvent.findAll({raw:true,transaction:t});
  const values=await M.StockValue.findAll({raw:true,transaction:t});
  const stocks=await M.Stock.findAll({raw:true,transaction:t});
  return extras({CostEvent:events,StockValue:values,Stock:stocks});
}
async function stocktake(stock,delta,unitCost,id,date,t){
  if(!delta)return {costDelta:0,costComplete:true,knownKgDelta:0};
  const row=await pool(stock,t),incoming=delta>0,kg=Math.abs(delta),complete=Number(row.kg)>0&&Number(row.kg)-Number(row.knownKg)<.00011;
  const cost=unitCost!=null?Number(unitCost):complete?Number(row.value)/Number(row.kg):null;
  const amount=incoming?{kg,knownKg:cost==null?0:kg,value:cost==null?0:round(kg*cost)}:part(row,kg);
  await movement(stock,amount,incoming,{id:'stocktake:'+id+':'+stock.productId,kind:incoming?'inventory-in':'inventory-out',date},t);
  return {costDelta:round((incoming?1:-1)*amount.value),knownKgDelta:(incoming?1:-1)*amount.knownKg,costComplete:kg-amount.knownKg<.00011};
}
function extras(d){
  return {costEvents:(d.CostEvent||[]).map(plain),stockValues:(d.Stock||[]).map(s=>({productId:s.productId,kg:Number(s.kg),knownKg:0,value:0,...plain((d.StockValue||[]).find(v=>v.productId===s.productId)||{})}))};
}
module.exports={production,shipment,acceptReturn,disposition,stocktake,readData,extras};
