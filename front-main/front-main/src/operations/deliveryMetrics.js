const {marginMetrics}=require('./marginMetrics');
function deliveryMetrics(data,from='',to=''){
 const m=marginMetrics(data,from,to),bonuses=new Map((data.clientBonuses||[]).filter(b=>b.kind==='goods').map(b=>[b.goods?.shipmentOrderId,b.goods?.sourceOrderId]));
 const groups=new Map();
 for(const row of m.rows){
  const bonus=bonuses.has(row.orderId),id=bonuses.get(row.orderId)||row.orderId||'legacy:'+row.id;
  const source=(data.orders||[]).find(o=>o.id===id),g=groups.get(id)||{id,customer:source?.destination?.customerName||source?.company||row.client,client:source?.destination?.outletName||row.client,date:source?.shippedAt?.slice(0,10)||row.date,revenue:0,cost:0,bonusCost:0,bonusKg:0,complete:true};
  g.revenue+=row.revenue;g.cost+=row.knownCost;g.complete=g.complete&&row.complete;if(bonus){g.bonusCost+=row.knownCost;g.bonusKg+=row.kg;}groups.set(id,g);
 }
 return [...groups.values()].map(g=>({...g,result:g.complete?g.revenue-g.cost:null})).sort((a,b)=>b.date.localeCompare(a.date));
}
module.exports={deliveryMetrics};
