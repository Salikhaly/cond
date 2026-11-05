require('dotenv').config();
process.env.TELEGRAM_ENABLED='false';
const { Client } = require('pg');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const config = { host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
const today=require('../src/services/businessDay').today();
const stamp = Date.now(), names = [`cond_sync_source_${stamp}`, `cond_sync_cloud_${stamp}`];
const db = new Client({ ...config, database: 'postgres' });
const children = new Set();
let sql;
const key = 'isolated-test-only-key-32-characters-minimum';
let count = 0;
function check(value, label) { assert.ok(value, label); count++; console.log('PASS ' + label); }
async function start(database, port, role) {
    let logs = '';
    const child = spawn(process.execPath, ['src/index.js'], { windowsHide: true, env: { ...process.env, DB_NAME: database, PORT: String(port), HOST: '127.0.0.1', LOCAL_DEMO: 'true', SYNC_ROLE: role, SYNC_CLOUD_URL: 'http://127.0.0.1:3004', SYNC_ALLOW_LOCAL_HTTP: 'true', SYNC_AUTO: 'false', SYNC_SHARED_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(child);
    child.stdout.on('data', b => { logs = (logs + b).slice(-5000); }); child.stderr.on('data', b => { logs = (logs + b).slice(-5000); });
    for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return child; } catch {} await new Promise(r => setTimeout(r, 100)); }
    throw new Error('Startup failed: ' + logs);
}
async function stop(child) { if (child.exitCode === null && child.signalCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; } children.delete(child); }
async function call(port, route, token, body, expected = 200) {
    const res = await fetch(`http://127.0.0.1:${port}/api` + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-Operation-Id':require('node:crypto').randomUUID(), Authorization: 'Bearer ' + (token || '') }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await res.json(); assert.equal(res.status, expected, route + ': ' + JSON.stringify(data)); return data;
}
const login = async (port, who) => (await call(port, '/operations/session', null, { email: who + '@local.test', password: 'Local2026!demo' })).accessToken;
async function main() {
    await db.connect();
    for (const port of [3003, 3004]) {
        let occupied = false;
        try { await fetch(`http://127.0.0.1:${port}/api/health`); occupied = true; } catch {}
        if (occupied) throw new Error('Test port already occupied: ' + port + '. Stop the browser fixture first.');
    }
    for (const name of names) await db.query(`CREATE DATABASE "${name}"`);
    let source = await start(names[0], 3003, 'local');
    let admin = await login(3003, 'admin');
    const workerToken=await login(3003,'worker'),initial=await call(3003,'/operations/dashboard',admin);
    const output=await call(3003,'/operations/productions',workerToken,{productId:initial.products[0].id,kg:1,date:today});
    await call(3003,'/operations/productions/'+output.id+'/post',admin,{});
    const before = await call(3003, '/operations/dashboard', admin);
    const material = before.materials[0];
    const financedReceipt=await call(3003, '/operations/receipts', admin, { materialId: material.id, quantity: 2, unitCost: 10, date: today });
    await call(3003,'/operations/receipts/'+financedReceipt.id+'/pay',admin,{amount:6,method:'kaspi',date:today});
    const correctedMaterial=await call(3003,'/operations/materials',admin,{name:'Корректировка в копии',unit:'кг'});
    const correctedReceipt=await call(3003,'/operations/receipts',admin,{supplier:'Поставщик исправленного прихода',date:today,lines:[{materialId:correctedMaterial.id,quantity:10,unitCost:20}],initialPayment:{date:today,amount:50,method:'cash'}});
    const correctionBody={date:today,reason:'Уточнена цена поставщика',expectedVersion:0,lines:[{materialId:correctedMaterial.id,quantity:10,unitCost:30}]};
    const preview=await call(3003,'/operations/receipts/'+correctedReceipt.id+'/corrections/preview',admin,correctionBody);
    await call(3003,'/operations/receipts/'+correctedReceipt.id+'/corrections',admin,{...correctionBody,confirmed:true,fingerprint:preview.fingerprint});
    await call(3003,'/operations/packaging/boxes',admin,{capacityKg:3,filmQtyM:0});
    check((await call(3003, '/operations/sync/status', admin)).pending > 0, 'Operations save locally while external server is absent');
    await call(3003, '/operations/sync/send', admin, {}, 400);
    sql = new Client({ ...config, database: names[0] }); await sql.connect();
    const saved = (await sql.query('SELECT * FROM sync_batches WHERE "sentAt" IS NULL')).rows[0];
    check(Boolean(saved) && (await call(3003, '/operations/sync/status', admin)).pending > 0, 'Failed delivery retains immutable batch and unsent changes');
    await sql.query('INSERT INTO staff_contacts ("userId",contacts,"createdAt","updatedAt") VALUES ($1,$2,now(),now())',[initial.workers[0].id,JSON.stringify([{name:'Private test mother',relation:'Mother',phone:'+70009990000'}])]);
    const pendingBefore = (await sql.query('SELECT count(*) FROM sync_changes')).rows[0].count;
    await sql.query('BEGIN'); await sql.query('UPDATE materials SET quantity=quantity+1'); await sql.query('ROLLBACK');
    check((await sql.query('SELECT count(*) FROM sync_changes')).rows[0].count === pendingBefore, 'Rolled-back inventory change never enters upload queue');
    await stop(source); source = await start(names[0], 3003, 'local'); admin = await login(3003, 'admin');
    check((await call(3003, '/operations/sync/status', admin)).pending > 0, 'Unsent changes survive application restart');
    await start(names[1], 3004, 'cloud');
    const ca = await login(3004, 'admin'), cf = await login(3004, 'firm'), cw = await login(3004, 'worker');
    await call(3003, '/operations/sync/send', admin, {});
    check((await call(3003, '/operations/sync/status', admin)).pending === 0, 'Confirmed upload acknowledges queued changes');
    const copy = await call(3004, '/operations/dashboard', ca);
    check(Number(copy.materials.find(m => m.id === material.id).quantity) === Number(material.quantity) + 2, 'Received copy contains current stock from source database');
    check(copy.receiptCorrections.some(c=>c.receiptId===correctedReceipt.id&&Number(c.totalDelta)===100)&&copy.boxRules.some(r=>Number(r.capacityKg)===3),'Cloud copy exposes correction history and shared packaging rules');
    const newest=(await sql.query('SELECT * FROM sync_batches WHERE "sentAt" IS NOT NULL ORDER BY id DESC LIMIT 1')).rows[0];
    const body = { sourceId: newest.sourceId, version: newest.id, payload: newest.payload, checksum: newest.checksum };
    if(String(newest.id)!==String(saved.id)){await call(3004,'/sync/receive',key,{sourceId:saved.sourceId,version:saved.id,payload:saved.payload,checksum:saved.checksum},400);check(true,'Older pending batch cannot overwrite a newer startup catalogue snapshot');}
    await call(3004, '/sync/receive', key, body);
    await call(3004, '/sync/receive', key, body);
    check(JSON.stringify((await call(3004, '/operations/dashboard', ca)).materials) === JSON.stringify(copy.materials), 'Repeated delivery does not repeat inventory or payroll operations');
    await call(3004, '/sync/receive', 'wrong', body, 401);
    await call(3004, '/sync/receive', key, { ...body, checksum: 'invalid' }, 400);
    await call(3004, '/sync/receive', key, { ...body, version: '0' }, 400);
    check(true, 'Invalid authentication, checksum and stale version are rejected');
    const fd = await call(3004, '/operations/dashboard', cf);
    const wd = await call(3004, '/operations/dashboard', cw);
    check(copy.costEvents.some(e=>e.id==='production:'+output.id)&&copy.stockValues.some(v=>Number(v.knownKg)===1&&Number(v.value)>0),'Cloud mirror retains immutable production valuation');
    check(!fd.costEvents&&!wd.costEvents&&!fd.stockValues&&!wd.stockValues,'Cost snapshots remain administrator-only in cloud copy');
    check(!fd.materials && !fd.productions && fd.payees.length===1 && fd.payees[0].role==='representative' && fd.payroll.every(s=>s.userId===fd.payees[0].id) && !wd.materials && wd.workers.length === 1, 'Remote copy preserves representative and employee access boundaries');
    await call(3004, '/operations/materials', ca, { name: 'Blocked', unit: 'кг' }, 409);
    check(true, 'Remote mirror blocks independent inventory writes');
    const financeCopy=await call(3004,'/operations/trade-finance',ca);
    check(financeCopy.suppliers.some(s=>s.debt===14&&s.paid===6),'Cloud copy preserves partial supplier payment and outstanding balance');
    check(financeCopy.suppliers.some(s=>s.name==='Поставщик исправленного прихода'&&s.debt===250&&s.purchases===300),'Cloud financial report applies receipt correction to supplier balance');
    await call(3004,'/operations/trade-finance',cf,undefined,403);
    check(true,'Representative cannot read cloud financial ledger');
    await call(3003, '/operations/receipts', admin, { materialId: material.id, quantity: 1, unitCost: 10, date: today });
    await call(3003, '/operations/sync/send', admin, {});
    check(Number((await call(3004, '/operations/dashboard', ca)).materials.find(m => m.id === material.id).quantity) === Number(material.quantity) + 3, 'Next upload advances copy and cannot be overwritten by an old batch');
    await call(3004, '/sync/receive', key, body, 400);
    const dumped = JSON.stringify((await sql.query('SELECT payload FROM sync_batches ORDER BY id DESC LIMIT 1')).rows[0].payload);
    check(!dumped.includes('Private test mother')&&!dumped.includes('+70009990000')&&!dumped.includes('StaffContact'),'Private family contacts excluded from uploaded copy');
    const cloudMoney=await call(3004,'/operations/money',ca);check(cloudMoney.rows.some(r=>r.amount===-6)&&cloudMoney.accounts.length===3,'Owner money report reads linked payments from replica');
    check(!dumped.includes('"password"') && !dumped.includes('refreshToken'), 'Uploaded business copy excludes passwords and sessions');
    await sql.end(); sql = null;
    console.log(`\n${count} sync checks passed in two isolated local databases`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
    for (const child of [...children]) await stop(child);
    if (sql) await sql.end();
    for (const name of names) await db.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await db.end();
});

