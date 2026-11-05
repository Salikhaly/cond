const assert=require('assert/strict'),{receiptDraftTotal:total}=require('../src/operations/receiptDraftTotal');
assert.equal(total({lines:[{purchasePack:{count:2,size:100,pricePerUnit:3}}]}),600);
assert.equal(total({lines:[{purchasePack:{size:306,pricePerUnit:35}}],extraCosts:[{amount:500}]}),11210);
assert.equal(total({lines:[{purchasePack:{count:2,price:1000}},{quantity:1.5,unitCost:200}]}),2300);
assert.equal(total({lines:[{quantity:'',unitCost:''},{purchasePack:{count:'',size:'',pricePerUnit:''}}]}),0);
console.log('4 receipt draft total checks passed');
