// Disposable browser fixture. Commands: offline, online, quit.
require('dotenv').config();
process.env.TELEGRAM_ENABLED='false';
const { Client } = require('pg');
const { spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');
const fs = require('node:fs');
const fixtureLog = fs.openSync(path.resolve('../../artifacts/phone-fixture.log'), 'w');
const database = 'cond_phone_test_' + Date.now();
const db = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'postgres' });
let api, web;
async function halt(p) { if (p && p.exitCode === null && p.signalCode === null) { const ended = new Promise(r => p.once('exit', r)); p.kill(); await ended; } }
async function online() {
    api = spawn(process.execPath, ['src/index.js'], { windowsHide: true, stdio: ['ignore',fixtureLog,fixtureLog], env: { ...process.env, DB_NAME: database, HOST: '127.0.0.1', PORT: '3001', LOCAL_DEMO: 'true', SYNC_AUTO: 'false', SYNC_CLOUD_URL: '' } });
    web = spawn(process.execPath, ['scripts/local-web.js'], { cwd: path.resolve('../../front-main/front-main'), windowsHide: true, stdio: ['ignore',fixtureLog,fixtureLog], env: { ...process.env, COND_SESSION_COOKIE:'cond_refresh_'+require('node:crypto').createHash('sha256').update(database).digest('hex').slice(0,12), WEB_HOST: '127.0.0.1', WEB_PORT: '9001', API_PORT: '3001' } });
    for (let i = 0; i < 300; i++) { try { if ((await fetch('http://127.0.0.1:3001/api/health')).ok) { console.log('ONLINE http://127.0.0.1:9001 database=' + database); return; } } catch {} await new Promise(r => setTimeout(r, 100)); }
    throw new Error('Fixture failed');
}
async function offline() { await halt(api); await halt(web); console.log('OFFLINE: both API and web stopped'); }
async function finish() { await offline(); await db.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); await db.end(); process.exit(); }
(async () => {
    await db.connect(); await db.query(`CREATE DATABASE "${database}"`); await online();
    let chain = Promise.resolve();
    readline.createInterface({ input: process.stdin }).on('line', line => { chain = chain.then(() => line.trim() === 'offline' ? offline() : line.trim() === 'online' ? online() : line.trim() === 'quit' ? finish() : undefined).catch(console.error); });
    process.on('SIGINT', finish);
})().catch(async e => { console.error(e); await finish(); });
