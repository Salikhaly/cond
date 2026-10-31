require('dotenv').config();
process.env.TELEGRAM_ENABLED='false';
const {Client} = require('pg');
const {spawn} = require('node:child_process');
const {randomBytes} = require('node:crypto');
const assert = require('node:assert/strict');
const stamp=Date.now(), database='cond_production_test_'+stamp, role='cond_app_test_'+stamp, password=randomBytes(24).toString('hex');
const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD};
const root=new Client({...config,database:'postgres'});
let server, logs='', count=0;
const check=(value,label)=>{assert.ok(value,label);count++;console.log('PASS '+label);};
async function halt(){if(server && server.exitCode===null && server.signalCode===null){const ended=new Promise(r=>server.once('exit',r));server.kill();await ended;}}
function start(){logs='';server=spawn(process.execPath,['src/index.js'],{windowsHide:true,env:{...process.env,NODE_ENV:'production',LOCAL_DEMO:'false',HOST:'127.0.0.1',PORT:'3001',DB_USER:role,DB_PASSWORD:password,DB_NAME:database,CLIENT_URL:'https://cond.test',SECRET_KEY:randomBytes(48).toString('hex'),SUPERADMIN_EMAILS:'admin@cond.test',SUPERADMIN_PASSWORD:'Strong-production-test-2581',SMTP_HOST:'smtp.invalid',SMTP_PORT:'587',SMTP_USER:'admin@cond.test',SMTP_PASSWORD:'smtp-validation-test',SYNC_AUTO:'false',SYNC_CLOUD_URL:''},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>{logs=(logs+b).slice(-5000);});server.stderr.on('data',b=>{logs=(logs+b).slice(-5000);});}
async function wait(){for(let i=0;i<100;i++){if(server.exitCode!==null)throw new Error(logs);try{if((await fetch('http://127.0.0.1:3001/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Startup timed out '+logs);}
async function main(){
    await root.connect();
    let occupied=false;try{await fetch('http://127.0.0.1:3001/api/health');occupied=true;}catch{}if(occupied)throw new Error('Test port 3001 occupied');
    const sql=(await root.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE',$1::text,$2::text) AS sql",[role,password])).rows[0].sql;
    await root.query(sql);await root.query(`CREATE DATABASE "${database}" OWNER "${role}"`);
    start();await wait();
    check(true,'Production API starts with a regular PostgreSQL role and strict configuration');
    const app=new Client({...config,user:role,password,database});await app.connect();
    try{
        check(!(await app.query('SELECT usesuper FROM pg_user WHERE usename=current_user')).rows[0].usesuper,'Application database account is not a superuser');
        const users=(await app.query('SELECT email,password,role FROM users')).rows;
        check(users.length===1 && users[0].email==='admin@cond.test' && users[0].role==='super_admin' && users[0].password!=='Strong-production-test-2581','Fresh production creates only the configured administrator, with a password hash');
        check((await app.query('SELECT count(*)::int AS count FROM materials')).rows[0].count===0,'Production does not seed demo ingredients or stock');
        const session=await fetch('http://127.0.0.1:3001/api/operations/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@local.test',password:'Local2026!demo'})});
        check(session.status===404,'Demo login endpoint is disabled in production');
        const original=users[0].password;await halt();start();await wait();
        check((await app.query('SELECT count(*)::int AS count FROM outcome_categories WHERE name=$1',['Зарплата'])).rows[0].count===1 && (await app.query('SELECT password FROM users WHERE email=$1',['admin@cond.test'])).rows[0].password===original,'Restart does not duplicate categories or reset administrator password');
        await halt();await app.query('INSERT INTO users(email,role,"createdAt","updatedAt") VALUES ($1,$2,now(),now())',['admin@local.test','super_admin']);
        start();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Unsafe production did not stop')),10000);server.once('exit',()=>{clearTimeout(timer);resolve();});});
        check(server.exitCode!==0 && logs.includes('contains demo accounts'),'Production refuses to start when demo accounts are imported');
    }finally{await app.end();}
    console.log(count+' production startup checks passed; no email was sent');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await halt();try{await root.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);await root.query(`DROP ROLE IF EXISTS "${role}"`);}finally{await root.end();}});
