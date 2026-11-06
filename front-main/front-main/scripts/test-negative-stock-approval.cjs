const assert=require('node:assert/strict'),{canApproveOrder,orderReadiness}=require('../src/operations/orderReadiness');
const order={status:'submitted',lines:[{productId:1,packId:'box',boxes:3,kg:3}]},product={id:1,availableKg:-2,packs:[{id:'box',capacityKg:1,availableBoxes:-2}]};
assert.equal(canApproveOrder(order,[product]),false);
const allowed={...product,allowNegativeStock:true};assert.equal(canApproveOrder(order,[allowed]),true);
assert.equal(orderReadiness(order,[allowed]).ready,false); // Planning still shows physical demand.
assert.equal(canApproveOrder(order,[{...allowed,packs:[]}]),false);
assert.equal(canApproveOrder({...order,_pending:true},[allowed]),false);
assert.equal(canApproveOrder({...order,lines:[]},[allowed]),false);
console.log('6 negative-stock approval checks passed');
