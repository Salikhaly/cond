const assert=require('node:assert/strict'),{stockReallocation}=require('../src/domain/stockReallocation');
const stock={kg:6,reservedKg:1},packs=[{id:'one',capacityKg:1,boxes:8,reservedBoxes:1}];
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('Historical 6 kg / 8 boxes becomes 6 kg / 6 boxes without another weight shortage',()=>{const r=stockReallocation(stock,packs,{kg:6,packs:[{packId:'one',boxes:6}]});assert.equal(r.deltaKg,0);assert.equal(r.packs[0].deltaBoxes,-2);assert.equal(r.looseKg,0);});
test('A real lower total changes mass once, not once per counted box',()=>{const r=stockReallocation(stock,packs,{kg:5,packs:[{packId:'one',boxes:4}]});assert.equal(r.deltaKg,-1);assert.equal(r.looseKg,1);});
test('Different sizes share one verified total weight',()=>{const r=stockReallocation(stock,[...packs,{id:'two',capacityKg:2,boxes:0}],{kg:6,packs:[{packId:'one',boxes:2},{packId:'two',boxes:2}]});assert.equal(r.boxedKg,6);assert.equal(r.deltaKg,0);});
test('Cannot invent more boxed mass than the physical total',()=>assert.throws(()=>stockReallocation(stock,packs,{kg:6,packs:[{packId:'one',boxes:7}]})));
test('Reserved boxes and kilograms are protected',()=>{assert.throws(()=>stockReallocation(stock,packs,{kg:6,packs:[{packId:'one',boxes:0}]}));assert.throws(()=>stockReallocation(stock,packs,{kg:.5,packs:[{packId:'one',boxes:1}]}));});
test('Incomplete, duplicated and foreign sizes cannot be accepted',()=>{for(const rows of [[],[{packId:'foreign',boxes:6}],[{packId:'one',boxes:3},{packId:'one',boxes:3}]])assert.throws(()=>stockReallocation(stock,packs,{kg:6,packs:rows}));});
test('No fractional boxes, hidden booleans or empty weights',()=>{for(const boxes of [1.5,true,-1,''])assert.throws(()=>stockReallocation(stock,packs,{kg:6,packs:[{packId:'one',boxes}]}));assert.throws(()=>stockReallocation(stock,packs,{kg:'',packs:[{packId:'one',boxes:6}]}));});
test('Original stock and pack records stay immutable',()=>{const before=JSON.stringify({stock,packs});stockReallocation(stock,packs,{kg:6,packs:[{packId:'one',boxes:6}]});assert.equal(JSON.stringify({stock,packs}),before);});
console.log(n+' stock reallocation policy checks passed');
