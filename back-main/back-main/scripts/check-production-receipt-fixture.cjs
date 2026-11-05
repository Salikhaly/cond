require('dotenv').config();
const database=process.argv[2];
if(!/^cond_phone_test_\d+$/.test(database||''))throw Error('Disposable phone database required');
delete process.env.DATABASE_URL;Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false'});
const assert=require('node:assert/strict'),db=require('../src/database/sequelize');
(async()=>{
 require('../src/app');const M=require('../src/models/operations'),{User,Product}=require('../src/models/models');
 const owner=(await User.findOne({where:{email:'admin@local.test'}})).toJSON(),product=await Product.findOne({where:{name:'UI · Выпуск после прихода'}}),material=await M.Material.findOne({where:{name:'UI · Сырьё для проверки выпуска'}});
 const outputs=await M.Production.findAll({where:{productId:product.id}}),posted=outputs.filter(p=>p.status==='posted');assert.equal(outputs.length,1);assert.equal(posted.length,1);
 const output=posted[0],stock=await M.Stock.findByPk(product.id),packStock=await M.PackStock.findByPk(output.packId);
 assert.equal(Number(stock.kg),2);assert.equal(Number(packStock.boxes),2);assert.equal(Number(material.quantity),0);
 assert.equal(Number(output.totalCost),306);assert.equal(Number(output.laborCost),100);
 const receipts=(await M.ReceiptDocument.findAll()).filter(d=>d.lines.some(l=>l.materialId===material.id));assert.equal(receipts.length,1);assert.equal(Number(receipts[0].total),100);
 const ledger=await require('../src/services/tradeFinanceService').visible(owner),supplier=ledger.suppliers.find(s=>s.name==='UI · Сырьё');assert.equal(supplier.debt,100);assert.equal(supplier.paid,0);
 const reconciliation=await require('../src/services/reconciliationService')(owner);assert.equal(reconciliation.ok,true,reconciliation.issues.join('; '));
 console.log('12 browser-flow accounting checks passed: one receipt 100; one posted act; 2 boxes / 2 kg; raw material 0; cost 306; wage 100; supplier debt 100; no payment; reconciliation OK');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
