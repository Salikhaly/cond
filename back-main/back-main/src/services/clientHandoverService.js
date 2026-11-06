const db=require('../database/sequelize'),M=require('../models/operations'),{User}=require('../models/models'),{State}=require('../models/sync'),crypto=require('crypto'),ApiError=require('../exceptions/ApiError');
const marker='client-clean-start:v1',backupKey='client-handover-backup:v1';
async function clean(actor,body){
 await require('./authorityService').owner(actor);
 if(process.env.PUBLIC_DEMO!=='true'||actor.email!=='admin@demo.test'||body.confirm!=='EMPTY COND FOR CLIENT 2026-11-06')throw ApiError.forbiddenRequest('Одноразовая передача демо владельцем');
 if(typeof body.programmerPassword!=='string'||body.programmerPassword.length<24||body.programmerPassword.length>72)throw ApiError.badRequest('Нужен отдельный пароль программиста');
 const hash=await require('bcrypt').hash(body.programmerPassword,12);
 return db.transaction(async t=>{
  await db.query('SELECT pg_advisory_xact_lock(42810399)',{transaction:t});
  if(await State.findByPk(marker,{transaction:t}))throw ApiError.badRequest('Передача уже выполнена. Повторная очистка запрещена');
  const [tables]=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",{transaction:t}),quote=n=>db.getQueryInterface().queryGenerator.quoteIdentifier(n);
  await db.query('LOCK TABLE '+tables.map(r=>quote(r.tablename)).join(',')+' IN ACCESS EXCLUSIVE MODE',{transaction:t});
  const owner=await User.findByPk(actor.id,{transaction:t});if(!owner||owner.email!=='admin@demo.test')throw ApiError.forbiddenRequest('Аккаунт изменён');
  const snapshot={format:'cond-table-data-v1',at:new Date().toISOString(),tables:[]};
  for(const {tablename:name}of tables){const [rows]=await db.query('SELECT COALESCE(json_agg(t),\'[]\'::json)::text AS data FROM '+quote(name)+' t',{transaction:t});snapshot.tables.push({name,rowsJson:rows[0].data});}
  const checksum=crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  const retained={email:owner.email,name:'Администратор клиента',role:'super_admin',password:owner.password,email_confirmed:new Date()};
  await db.query('TRUNCATE '+tables.filter(r=>r.tablename!==State.getTableName()).map(r=>quote(r.tablename)).join(',')+' CONTINUE IDENTITY CASCADE',{transaction:t});
  await State.destroy({where:{key:{[require('sequelize').Op.notLike]:'schema:%'}},transaction:t});
  await State.create({key:backupKey,value:{checksum,snapshot}},{transaction:t});
  const admin=await User.create(retained,{transaction:t}),programmer=await User.create({email:'programmer@cond.local',name:'Программист',role:'super_admin',password:hash,email_confirmed:new Date()},{transaction:t});
  for(const u of [admin,programmer])await M.AccountAuthority.create({userId:u.id,tier:'owner',permissions:require('./authorityService').all,actorId:admin.id,actorName:admin.name},{transaction:t});
  for(const key of [require('./packCatalogService').marker,require('./packCatalogService').baseMarker,'public-demo-ready:v1'])await State.findOrCreate({where:{key},defaults:{value:{cleanClient:true}},transaction:t});
  await State.create({key:marker,value:{at:snapshot.at,checksum,adminId:admin.id,programmerId:programmer.id}},{transaction:t});
  await require('./expenseArticleService').ensure(t);await require('./moneyService').ensure(t);
  return {accounts:2,emptyBusiness:true,backupChecksum:checksum,adminId:admin.id,programmerId:programmer.id};
 });
}
async function backup(actor){await require('./authorityService').owner(actor);const record=await State.findByPk(backupKey);if(!record)throw ApiError.badRequest('Копии нет');return record.value;}
module.exports={clean,backup};
