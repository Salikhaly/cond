const assert=require('node:assert/strict'),{finishedStock}=require('../src/operations/finishedStock');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Kilogram output remains visible with zero boxes',()=>{const s=finishedStock({kg:1,reservedKg:0,availableKg:1,packs:[{boxes:0,capacityKg:1}]});assert.equal(s.freeKg,1);assert.equal(s.looseKg,1);assert.equal(s.boxes,0);});
test('Boxed weight is part of physical total, not additional stock',()=>{const s=finishedStock({kg:10.5,reservedKg:2.5,availableKg:8,packs:[{boxes:3,capacityKg:2.5},{boxes:2,capacityKg:1}]});assert.equal(s.boxes,5);assert.equal(s.looseKg,1);assert.equal(s.freeKg,8);assert.equal(s.kg,10.5);});
test('Legacy reservations cannot be bypassed by unreserved box counts',()=>{const s=finishedStock({kg:10,reservedKg:9,availableKg:1,packs:[{boxes:10,availableBoxes:10,capacityKg:1}]});assert.equal(s.freeKg,1);});
test('Old cached gross stock without reservation evidence stays unknown',()=>{assert.equal(finishedStock({kg:5,packs:[]}).freeKg,null);});
test('An explicit zero free stock does not fall back to gross stock',()=>{assert.equal(finishedStock({kg:5,reservedKg:5,availableKg:0}).freeKg,0);});
test('Representative projection does not invent gross or unpacked stock',()=>{const s=finishedStock({availableKg:3,packs:[{boxes:5,capacityKg:1}]});assert.equal(s.kg,null);assert.equal(s.looseKg,null);assert.equal(s.freeKg,3);});
test('Old cache with gross and reserved quantities can derive free stock',()=>{assert.equal(finishedStock({kg:'5.5',reservedKg:'1.5'}).freeKg,4);});
test('Negative or inconsistent quantities do not produce a negative loose balance',()=>{const s=finishedStock({kg:1,reservedKg:0,availableKg:1,packs:[{boxes:2,capacityKg:1}]});assert.equal(s.looseKg,0);});
test('Imported balance remains explicitly unverified even when recorded zero',()=>{assert.equal(finishedStock({kg:0,availableKg:0,stockVerified:false}).verified,false);assert.equal(finishedStock({kg:0,availableKg:0,stockVerified:true}).verified,true);});
console.log(checks+' finished-stock checks passed');
