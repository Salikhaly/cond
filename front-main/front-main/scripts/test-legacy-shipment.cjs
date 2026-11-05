const assert=require('node:assert/strict'),{legacyShipmentPlan,physicalShape}=require('../../../back-main/back-main/src/domain/legacyShipmentPlan');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
const product={kg:10,packs:[{id:'a',capacityKg:1,boxes:4,reservedBoxes:1},{id:'b',capacityKg:2,boxes:2,reservedBoxes:0}]};
test('Unboxed weight excludes all physical boxes including reserved boxes',()=>{const p=legacyShipmentPlan({kg:3},product);assert.equal(p.looseKg,2);assert.equal(p.missingLooseKg,1);assert.equal(p.complete,false);});
test('Mixed sizes and loose kilograms fulfil one unchanged kg line',()=>{const p=legacyShipmentPlan({kg:5},product,[{packId:'a',boxes:1},{packId:'b',boxes:1}]);assert.equal(p.complete,true);assert.equal(p.requiredLooseKg,2);assert.equal(p.selectedKg,3);});
test('Stock without boxes keeps legacy kg-only shipments working',()=>{assert.equal(legacyShipmentPlan({kg:2},{kg:5,packs:[]}).complete,true);});
test('Explicit selections cannot consume a box reserved elsewhere',()=>{assert.throws(()=>legacyShipmentPlan({kg:4},product,[{packId:'a',boxes:4}]),/свободных коробок/);});
test('A foreign pack cannot be selected',()=>{assert.throws(()=>legacyShipmentPlan({kg:2},product,[{packId:'foreign',boxes:1}]));});
test('Duplicate selections cannot bypass free stock',()=>{assert.throws(()=>legacyShipmentPlan({kg:4},product,[{packId:'a',boxes:2},{packId:'a',boxes:2}]));});
test('Fractional, negative and nonnumeric boxes are rejected',()=>{for(const boxes of [1.5,-1,'',true,{},'1,5'])assert.throws(()=>legacyShipmentPlan({kg:4},product,[{packId:'a',boxes}]));});
test('Box selection cannot exceed the commercial kg quantity',()=>{assert.throws(()=>legacyShipmentPlan({kg:1},product,[{packId:'b',boxes:1}]),/больше килограммов/);});
test('Historical impossible boxed weight is detected instead of inventing negative loose stock',()=>{assert.throws(()=>physicalShape({...product,kg:6}),/Вес коробок больше/);});
test('Missing cached stock is unknown, not a fabricated zero',()=>{assert.throws(()=>legacyShipmentPlan({kg:1},{packs:[]}),/Обновите/);});
test('Planning does not mutate source stock or commercial lines',()=>{const line={kg:5,price:123},before=JSON.stringify({line,product});legacyShipmentPlan(line,product,[{packId:'a',boxes:3}]);assert.equal(JSON.stringify({line,product}),before);});
console.log(n+' legacy shipment planning checks passed');
