require('dotenv').config();
const assert=require('assert/strict'),{Client}=require('pg');
const database='cond_staff_login_test_'+Date.now(),owner=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:'postgres'});
let db,created=false,server,n=0;const check=(value,label)=>{assert.ok(value,label);console.log('PASS '+label);n++;};
async function main(){
 await owner.connect();await owner.query('CREATE DATABASE "'+database+'"');created=true;delete process.env.DATABASE_URL;
 Object.assign(process.env,{DB_NAME:database,LOCAL_DEMO:'true',PUBLIC_DEMO:'false',TELEGRAM_ENABLED:'false',SMTP_PASSWORD:''});
 const app=require('../src/app'),{User}=require('../src/models/models'),M=require('../src/models/operations'),ops=require('../src/services/operationsService');db=require('../src/database/sequelize');require('../src/models/accountLink');await db.sync();await require('../src/database/seedLocal')();
 const admin=(await User.findOne({where:{role:'super_admin'}})).toJSON(),password='Local2026!demo';
 const worker=await ops.user(admin,{name:'Пекарь',email:'Baker.01',password,role:'employee'});
 check(worker.email==='baker.01'&&!!(await User.findByPk(worker.id)).email_confirmed,'Login account is active immediately without email');
 check(await require('../src/models/accountLink').count()===0,'Direct activation does not create an email invitation');
 await assert.rejects(()=>ops.user(admin,{name:'Другой',email:'BAKER.01',password,role:'employee'}));check(true,'Duplicate logins are rejected regardless of case');
 for(const email of ['ab','bad login','<script>'])await assert.rejects(()=>ops.user(admin,{name:'Test',email,password,role:'employee'}));check(true,'Invalid logins are rejected');
 await assert.rejects(()=>ops.user(worker,{name:'Test',email:'other',password,role:'employee'}));check(true,'Employee cannot activate other accounts');
 await ops.user(admin,{name:'Представитель',email:'rep-login',password,role:'representative'});check(true,'Representative can use a login without email too');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/operations';
 const login=async(email,pass=password)=>{const r=await fetch(base+'/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});return {status:r.status,body:await r.json()};};
 const result=await login(' BAKER.01 ');check(result.status===200&&result.body.accessToken&&result.body.user.role==='employee','Actual login endpoint accepts username immediately and preserves employee role');
 check((await login('baker.01','WrongPassword')).status===401,'Password remains required');
 await M.Access.create({userId:worker.id,disabled:true});check((await login('baker.01')).status===403,'Disabled account cannot enter using its login');
 check((await login('admin@local.test')).status===200,'Existing email login continues working');
 console.log(n+' staff login checks passed in isolated database '+database);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));if(db)await db.close();if(created)await owner.query('DROP DATABASE "'+database+'" WITH (FORCE)');await owner.end();});
