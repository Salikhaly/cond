const number=v=>Number.isFinite(Number(v))?Number(v):0;
const cents=v=>Math.round((v+Number.EPSILON)*100);
function receiptDraftTotal(body){
 const goods=(body.lines||[]).reduce((sum,line)=>{const pack=line.purchasePack;if(!pack)return sum+cents(number(line.quantity)*number(line.unitCost));const count=pack.count==null||pack.count===''?1:number(pack.count),price=pack.pricePerUnit!=null&&pack.pricePerUnit!==''?number(pack.size)*number(pack.pricePerUnit):number(pack.price);return sum+cents(count*price);},0);
 return (goods+(body.extraCosts||[]).reduce((sum,c)=>sum+cents(number(c.amount)),0))/100;
}
module.exports={receiptDraftTotal};
