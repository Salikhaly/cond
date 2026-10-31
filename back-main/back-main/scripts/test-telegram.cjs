require('dotenv').config();
const assert=require('node:assert/strict'),{Client}=require('pg'),{randomUUID}=require('crypto');
const database='cond_telegram_test_'+Date.now();
const owner=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:'postgres'});
let db,server,created=false,n=0;
const check=(value,label)=>{assert.ok(value,label);console.log('PASS '+label);n++;};
async function main(){
    await owner.connect();await owner.query('CREATE DATABASE "'+database+'"');created=true;
    delete process.env.DATABASE_URL;process.env.DB_NAME=database;process.env.LOCAL_DEMO='true';process.env.PUBLIC_DEMO='false';process.env.SYNC_ROLE='local';process.env.TELEGRAM_ENABLED='false';
    const app=require('../src/app');db=require('../src/database/sequelize');
    await db.sync();await require('../src/database/seedLocal')();
    const {User,Product,Salary}=require('../src/models/models'),M=require('../src/models/operations');
    const {TelegramMessage:Message}=require('../src/models/notifications'),tg=require('../src/services/telegramService'),ops=require('../src/services/operationsService');
    const users=await User.findAll(),admin=users.find(u=>u.role==='super_admin').toJSON(),worker=users.find(u=>u.role==='employee').toJSON(),firm=users.find(u=>u.role==='representative').toJSON(),product=await Product.findOne();
    const orderBody={deliveryDate:'2026-10-28',lines:[{productId:product.id,kg:3}]};
    await ops.order(firm,orderBody);check(await Message.count()===0,'Disabled bot does not collect old demo events');
    Object.assign(process.env,{TELEGRAM_ENABLED:'true',TELEGRAM_BOT_TOKEN:'123456:FakeTokenForIsolatedTestsOnly123456',TELEGRAM_GROUP_ID:'-100123456789',TELEGRAM_APP_URL:'https://cond.example.test',TELEGRAM_REMINDER_HOURS:'9,17'});
    check(tg.config().ready&&tg.config().enabled,'Configured group and HTTPS URL accepted');
    process.env.TELEGRAM_GROUP_ID='123';check(!tg.config().ready,'Private recipient rejected for the agreed group setup');process.env.TELEGRAM_GROUP_ID='-100123456789';
    const order=await ops.order(firm,orderBody),p=await ops.production(worker,{productId:product.id,kg:10,date:'2026-10-28'});
    const messages=await Message.findAll();check(messages.length===2&&messages.some(m=>m.text.includes('3 кг'))&&messages.some(m=>m.text.includes(worker.name)&&m.text.includes('пока не проведены')),'Order and employee act enqueue useful messages');
    check(Number((await M.Stock.findByPk(product.id)).kg)===0&&await Salary.count()===0,'Notifications do not post stock or wages');
    try{await db.transaction(async t=>{await tg.orderCreated(order,null,firm,t,'unused');throw Error('rollback');});}catch{}
    check(await Message.count()===2,'Document transaction cannot create a duplicate notification');
    try{await db.transaction(async transaction=>{const draft=await M.Production.create({workerId:worker.id,productId:product.id,kg:1,date:'2026-10-28'},{transaction});await tg.productionCreated(draft,product,worker,transaction);throw Error('rollback');});}catch{}
    check(await Message.count()===2,'Rolled back document leaves no notification');
    const sent=[],transport=async(url,options)=>{const body=JSON.parse(options.body);sent.push(body);return {ok:true,json:async()=>({ok:true,result:{message_id:sent.length}})};};
    await Promise.all([tg.deliver({transport}),tg.deliver({transport})]);
    check(sent.length===2&&await Message.count({where:{status:'sent'}})===2,'Concurrent queue workers send each queued document once');
    check(sent.every(m=>m.chat_id==='-100123456789'&&m.reply_markup.inline_keyboard[0][0].url.includes('document=')),'Messages target the configured group and link to the actual document');
    await tg.deliver({transport});check(sent.length===2,'Already sent messages are not sent on the next tick');
    const now=new Date('2026-10-28T04:15:00Z');
    check(tg.localTime(now).hour===9&&tg.localTime(new Date('2026-10-28T20:30:00Z')).date==='2026-10-29','Reminder clock follows Kazakhstan date and time');
    await tg.reminders(now);await tg.reminders(now);check(await Message.count({where:{type:'reminder'}})===1,'One reminder per configured group/date/hour');
    await Message.update({nextAttemptAt:now},{where:{type:'reminder'}});await tg.deliver({now:new Date('2026-10-28T04:30:00Z'),transport});check(sent.at(-1).text.includes('Новые заявки: 2')&&sent.at(-1).text.includes('Акты сотрудников: 1'),'Reminder includes actual unreviewed document counts');
    await tg.reminders(new Date('2026-10-28T06:00:00Z'));check(await Message.count({where:{type:'reminder'}})===1,'No reminders outside chosen hours');
    const pending=await ops.order(firm,orderBody);const pendingMessage=await Message.findOne({where:{entityId:pending.id}});
    const clock=new Date(Math.max(Date.now(),now.getTime())+1000);
    await tg.deliver({now:clock,transport:async()=>({ok:false,status:429,json:async()=>({ok:false,error_code:429,parameters:{retry_after:120}})})});
    await pendingMessage.reload();check(pendingMessage.status==='pending'&&pendingMessage.attempts===1&&pendingMessage.nextAttemptAt>=new Date(clock.getTime()+120000),'Telegram 429 retains the message and respects retry_after');
    let premature=0;await tg.deliver({now:new Date(clock.getTime()+60000),transport:async(...args)=>{premature++;return transport(...args);}});check(premature===0,'Retry is not sent before its due time');
    await tg.deliver({now:new Date(clock.getTime()+121000),transport});await pendingMessage.reload();check(pendingMessage.status==='sent','Queued message survives failure and sends later');
    const offline=await ops.order(firm,orderBody);await tg.deliver({now:new Date(Date.now()+1000),transport:async()=>{throw Error('secret URL must never escape');}});
    check((await Message.findOne({where:{entityId:offline.id}})).lastError==='Нет ответа от Telegram. Отправка будет повторена','Network errors are persisted without leaking token or URL');
    await M.Order.update({status:'cancelled'},{where:{id:offline.id}});await tg.deliver({now:new Date(Date.now()+3600000),transport});check((await Message.findOne({where:{entityId:offline.id}})).status==='obsolete','A cancelled offline order is not announced as new');
    const forbidden=await ops.order(firm,orderBody);await tg.deliver({now:new Date(Date.now()+1000),transport:async()=>({ok:false,status:403,json:async()=>({ok:false,error_code:403})})});
    check((await Message.findOne({where:{entityId:forbidden.id}})).status==='failed','Lost group access is visible as failed rather than an endless retry');
    const state=await tg.status(admin);check(state.failed===1&&!JSON.stringify(state).includes(process.env.TELEGRAM_BOT_TOKEN)&&!JSON.stringify(state).includes(process.env.TELEGRAM_GROUP_ID),'Admin status exposes counts but no token or group identifier');
    await tg.retry(admin);check((await Message.findOne({where:{entityId:forbidden.id}})).status==='pending','Admin can retry a failed delivery after correcting access');
    for(const role of [worker,firm])for(const action of [()=>tg.status(role),()=>tg.test(role),()=>tg.retry(role)]){await assert.rejects(action);n++;}
    process.env.PUBLIC_DEMO='true';const before=await Message.count();await ops.order(firm,orderBody);await tg.tick({transport});check((await tg.status(admin)).blocked&&await Message.count()===before,'Public demo blocks notification creation and delivery even with credentials');process.env.TELEGRAM_ALLOW_PUBLIC_DEMO='true';const demoOrder=await ops.order(firm,orderBody);check((await Message.findOne({where:{entityId:demoOrder.id}})).text.startsWith('🧪 Демо COND'), 'Explicit owner opt-in enables clearly labelled demo notifications');delete process.env.TELEGRAM_ALLOW_PUBLIC_DEMO;process.env.PUBLIC_DEMO='false';
    await M.Order.update({status:'cancelled'},{where:{status:'submitted'}});await M.Production.update({status:'cancelled'},{where:{status:'draft'}});
    await tg.reminders(new Date('2026-10-28T12:00:00Z'));check(await Message.count({where:{type:'reminder'}})===1,'No scheduled reminder after every pending document is resolved');
    // Full authenticated HTTP boundary and mobile replay of a single operation.
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/operations';
    const tokenService=require('../src/services/tokenService'),tokens=tokenService.generateToken({id:firm.id,email:firm.email,role:firm.role,name:firm.name});await tokenService.saveToken(firm.id,tokens.refreshToken);const token=tokens.accessToken;
    const id=randomUUID(),headers={'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Operation-Id':id};
    const a=await fetch(base+'/orders',{method:'POST',headers,body:JSON.stringify(orderBody)}),b=await fetch(base+'/orders',{method:'POST',headers,body:JSON.stringify(orderBody)});
    const first=await a.json(),second=await b.json();check(a.ok&&b.ok&&first.id===second.id&&await Message.count({where:{entityId:first.id}})===1,'Offline replay creates one order and one Telegram outbox entry');
    check((await fetch(base+'/telegram/status',{headers})).status===403,'Representative cannot access notification settings through HTTP');
    console.log('\n'+n+' Telegram checks passed in isolated DB '+database+'; no real messages sent.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));if(db)await db.close();if(created)await owner.query('DROP DATABASE "'+database+'" WITH (FORCE)');await owner.end();});
