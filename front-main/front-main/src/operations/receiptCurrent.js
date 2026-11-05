// Read the latest accounting version without modifying the original document.
function receiptCurrent(receipt,corrections=[]){
 const revisions=corrections.filter(c=>c.receiptId===receipt.id).sort((a,b)=>Number(b.version)-Number(a.version));
 return {...receipt,...(revisions[0]?.after||{}),revisions,originalTotal:Number(receipt.total)};
}
function receiptPayment(total,advance,mode,amount){
 const cents=n=>Math.round((Number(n)||0)*100),due=Math.max(0,cents(total)-cents(advance));
 const payment=mode==='full'?due:mode==='partial'?Math.max(0,cents(amount)):0;
 return {advanceApplied:Math.min(cents(total),Math.max(0,cents(advance)))/100,due:due/100,payment:payment/100,remaining:Math.max(0,due-payment)/100};
}
module.exports={receiptCurrent,receiptPayment};
