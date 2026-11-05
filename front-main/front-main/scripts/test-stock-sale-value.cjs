const assert=require('node:assert/strict'),{stockSaleValue}=require('../src/operations/stockSaleValue');
const data={customers:[{id:'a'},{id:'b'}],outlets:[{id:'shop',customerId:'a'}],clientPrices:[{customerId:'a',outletId:null,productId:1,startsOn:'2026-01-01',price:100},{customerId:'a',outletId:null,productId:1,startsOn:'2026-11-01',price:200},{customerId:'a',outletId:'shop',productId:1,startsOn:'2026-01-01',price:150},{customerId:'b',productId:1,startsOn:'2027-01-01',price:1}],products:[{id:1,name:'Печенье',kg:9,salePrice:250,packs:[{id:'one',capacityKg:1,boxes:2,reservedBoxes:1,salePrice:250},{id:'two',capacityKg:2,boxes:3,salePrice:500}]}]};
let v=stockSaleValue(data,'2026-11-05');assert.equal(v.total,1350);assert.equal(v.kg,9);assert.equal(v.boxes,5);assert.equal(v.rows.length,3);assert.equal(v.rows[1].price,300);assert.equal(v.rows[0].quantity,2);
data.clientPrices.push({customerId:'b',productId:1,startsOn:'2026-01-01',price:120});assert.equal(stockSaleValue(data,'2026-11-05').total,1080);
data.clientPrices.push({customerId:'b',productId:1,packId:'two',startsOn:'2026-01-01',price:200});assert.equal(stockSaleValue(data,'2026-11-05').rows[1].price,200);
data.products.push({id:2,name:'Без цены',kg:2,packs:[]});v=stockSaleValue(data,'2026-11-05');assert.equal(v.unknown,1);assert.equal(v.rows.at(-1).value,null);
assert.equal(stockSaleValue({products:[{id:1,kg:1,salePrice:0}]},'2026-11-05').total,0);assert.equal(stockSaleValue({products:[{id:1,kg:1,salePrice:0}]},'2026-11-05').unknown,0);
console.log('13 stock sale valuation checks passed');
