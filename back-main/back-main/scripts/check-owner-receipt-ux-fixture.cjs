require('dotenv').config();
const database=process.argv[2],expected=Number(process.argv[3]||1);if(!/^cond_phone_test_\d+$/.test(database||'')||![1,2].includes(expected))throw Error('Disposable phone database and expected receipt count required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
const assert=require('node:assert/strict'),db=require('../src/database/sequelize');
(async()=>{
 require('../src/app');const M=require('../src/models/operations'),{User}=require('../src/models/models');
 const owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),material=await M.Material.findOne({where:{name:'UI · Мука новая'}}),old=await M.Material.findOne({where:{name:'UI · Мука прежняя'}});
 const receipts=(await M.ReceiptDocument.findAll({where:{supplier:'UI · Повтор поставки'}})),original=receipts.find(r=>r.document==='UX-REPEAT-ORIGINAL'),newRows=receipts.filter(r=>r.id!==original.id);
 assert.equal(newRows.length,expected);assert.equal(Number(material.quantity),10*expected);assert.equal(Number(material.unitCost),120);assert.equal(old.active,false);assert.equal(Number(old.quantity),0);assert.equal(Number(original.total),1000);assert.equal(original.lines[0].materialId,old.id);
 for(const row of newRows){assert.equal(Number(row.total),1200);assert.equal(row.lines[0].materialId,material.id);assert.notEqual(row.document,original.document);const allocations=await M.CashAllocation.findAll({where:{documentType:'receipt',documentId:row.id}});assert.equal(allocations.reduce((s,a)=>s+Number(a.amount),0),500);for(const a of allocations){const entry=await M.CashEntry.findByPk(a.entryId);assert.equal(entry.method,'kaspi');}}
 const ledger=await require('../src/services/tradeFinanceService').visible(owner);assert.equal(ledger.suppliers.find(s=>s.name==='UI · Повтор поставки').debt,700*expected);
 if(process.argv.includes('--inventory')){
  const unknown=await M.Material.findOne({where:{name:'UI · Сырьё без цены для ревизии'}}),counts=(await M.StockCount.findAll({where:{status:'posted'}})).filter(c=>c.lines.some(l=>l.kind==='material'&&l.itemId===unknown.id));
  assert.equal(Number(unknown.quantity),3);assert.equal(counts.length,1);assert.equal(counts[0].lines.length,1);assert.equal(counts[0].lines[0].actualQty,3);assert.equal(counts[0].lines[0].unitCost,null);assert.equal(counts[0].lines[0].costComplete,false);
  assert.equal((await require('../src/services/materialPriceService').known([unknown])).has(unknown.id),false);
  console.log('Inventory UX verified: one selected item, 3 kg accepted once, price remains unknown');
 }
 const recon=await require('../src/services/reconciliationService')(owner);assert.equal(recon.ok,true,recon.issues.join('; '));
 console.log('Receipt UX verified: '+expected+' new receipts; '+(10*expected)+' kg at 120; '+(500*expected)+' Kaspi paid; debt '+(700*expected)+'; original and archive preserved; reconciliation OK');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
