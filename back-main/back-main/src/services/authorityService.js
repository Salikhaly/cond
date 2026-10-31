const db=require('../database/sequelize'),M=require('../models/operations'),{User,Token}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const defaults={catalog:true,materials:true,production:true,orders:true,customers:true,suppliers:true,finance:true,cash:false,payroll:false,inventory:false,users:false,settings:false,pastDates:false,adjustFinance:false};
const all=Object.fromEntries(Object.keys(defaults).map(k=>[k,true]));
function resolve(user,rows,admins){
 if(user.role!=='super_admin')return {owner:false,permissions:{}};
 const row=rows.find(r=>r.userId===user.id),first=[...admins].sort((a,b)=>a.id-b.id)[0];
 const owner=row?row.tier==='owner':first?.id===user.id;
 return {owner,permissions:owner?all:{...defaults,...(row?.permissions||{})}};
}
async function access(user,t){
 if(user.role!=='super_admin')return {owner:false,permissions:{}};
 const rows=await M.AccountAuthority.findAll({raw:true,transaction:t}),admins=await User.findAll({where:{role:'super_admin'},attributes:['id'],raw:true,transaction:t});return resolve(user,rows,admins);
}
async function cloudAccess(user){
 const replica=await require('../models/sync').Replica.findByPk('primary'),d=replica?.payload;if(!d)return {owner:false,permissions:{}};
 const source=d.users.find(u=>u.email===user.email);if(!source||source.role!==user.role)throw ApiError.forbiddenRequest('Аккаунт не связан с локальной базой');
 return resolve(source,d.AccountAuthority||[],d.users.filter(u=>u.role==='super_admin'));
}
async function owner(user,t){const a=await access(user,t);if(!a.owner)throw ApiError.forbiddenRequest('Только владелец бизнеса');return a;}
async function list(user){await owner(user);const rows=await M.AccountAuthority.findAll({raw:true}),admins=await User.findAll({where:{role:'super_admin'},attributes:['id','name','email','role'],raw:true}),disabled=await M.Access.findAll({raw:true});return admins.map(u=>({...u,...resolve(u,rows,admins),disabled:!!disabled.find(a=>a.userId===u.id)?.disabled}));}
async function set(user,id,b){
 await owner(user);return db.transaction(async t=>{
  await db.query('SELECT pg_advisory_xact_lock(42810292)',{transaction:t});
  const target=await User.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!target||target.role!=='super_admin')throw ApiError.badRequest('Выберите администратора');
  if(!['owner','admin'].includes(b.tier))throw ApiError.badRequest('Выберите полномочия');
  if(b.permissions==null||typeof b.permissions!=='object'||Array.isArray(b.permissions)||Object.entries(b.permissions).some(([k,v])=>!Object.hasOwn(defaults,k)||typeof v!=='boolean'))throw ApiError.badRequest('Проверьте разрешения');
  if(b.disabled!==undefined&&typeof b.disabled!=='boolean')throw ApiError.badRequest('Проверьте состояние доступа');
  const users=await User.findAll({where:{role:'super_admin'},attributes:['id','role'],raw:true,transaction:t}),rows=await M.AccountAuthority.findAll({raw:true,transaction:t}),disabled=await M.Access.findAll({raw:true,transaction:t});
  const activeOwners=users.filter(u=>resolve(u,rows,users).owner&&!disabled.find(a=>a.userId===u.id)?.disabled);
  if(activeOwners.some(u=>u.id===target.id)&&activeOwners.length===1&&(b.tier!=='owner'||b.disabled))throw ApiError.badRequest('Должен оставаться хотя бы один действующий владелец');
  if(process.env.PUBLIC_DEMO==='true'&&target.email==='admin@demo.test'&&(b.tier!=='owner'||b.disabled))throw ApiError.forbiddenRequest('Доступ владельца общей демоверсии сохраняется');
  await M.AccountAuthority.upsert({userId:target.id,tier:b.tier,permissions:{...defaults,...b.permissions},actorId:user.id,actorName:user.name},{transaction:t});
  if(b.disabled!==undefined)await M.Access.upsert({userId:target.id,disabled:b.disabled},{transaction:t});
  if(target.id!==user.id||b.tier!=='owner'||b.disabled)await Token.destroy({where:{userId:target.id},transaction:t});return {id:target.id,...resolve(target.toJSON(),[{userId:target.id,tier:b.tier,permissions:{...defaults,...b.permissions}}],users),disabled:b.disabled===undefined?!!disabled.find(a=>a.userId===target.id)?.disabled:b.disabled};
 });
}
async function create(user,b){
 await owner(user);const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof b.password!=='string'||b.password.length<10||b.password.length>72||typeof b.name!=='string'||!b.name.trim()||b.name.length>250)throw ApiError.badRequest('Нужны имя, email и пароль от 10 символов');
 const password=await require('bcrypt').hash(b.password,10);return db.transaction(async t=>{const u=await User.create({email,name:b.name.trim(),password,role:'super_admin',email_confirmed:new Date()},{transaction:t});await M.AccountAuthority.create({userId:u.id,tier:'admin',permissions:defaults,actorId:user.id,actorName:user.name},{transaction:t});return {id:u.id,name:u.name,email:u.email,role:u.role,authority:{owner:false,permissions:defaults}};});
}
async function authorize(req){
 if(req.user.role!=='super_admin'){
  if(req.user.role==='employee'&&req.method==='POST'&&req.path==='/productions'&&req.body?.date>require('./businessDay').today())throw ApiError.badRequest('За прошлый день отправьте запрос администратору. Будущий выпуск пока не записывается');
  return;
 }
 const a=req.user.authority||await access(req.user);if(a.owner)return;const p=a.permissions,path=req.path,write=!['GET','HEAD'].includes(req.method),segment=path.split('/')[1];
 if(['audit','exchange','authority','money','money-accounts','money-documents','money-links'].includes(segment))throw ApiError.forbiddenRequest('Раздел доступен владельцу');
 if(segment==='sync'&&write)throw ApiError.forbiddenRequest('Отправку копии запускает владелец');
 let permission={'expense-articles':'catalog','staff-contacts':'payroll',products:'catalog',recipes:'catalog',packaging:'catalog',materials:'materials',receipts:'materials','receipt-drafts':'materials','stock-counts':'inventory',orders:'orders',returns:'orders','return-credits':'cash',outlets:'customers','client-prices':'customers',suppliers:'suppliers','trade-finance':'finance',expenses:'cash',payments:'payroll','representative-payroll':'payroll',users:'users',telegram:'settings',reconciliation:'settings',preview:'production',productions:'production',cash:'cash','work-days':'payroll','work-profiles':'payroll','work-recalculate':'payroll'}[segment];
 if(segment==='wage-requests'){
  const request=req.path.split('/')[2]?await M.WageRequest.findByPk(req.path.split('/')[2]):null,type=request?.type||req.body?.type;
  if(!type&&req.method==='GET'){if(!p.production&&!p.payroll)throw ApiError.forbiddenRequest();permission='requestsRead';}
  else permission=type==='late_production'?'production':'payroll';
 }
 if(!permission&&!['me','dashboard','sync'].includes(segment))throw ApiError.forbiddenRequest('Раздел не разрешён владельцем');
 if(permission&&permission!=='requestsRead'&&!p[permission])throw ApiError.forbiddenRequest('Владелец не разрешил этот раздел');
 if(write&&path.match(/^\/expenses\/[^/]+\/(classification|reverse)$/)&&!p.adjustFinance)throw ApiError.forbiddenRequest('Исправление финансовых записей разрешает владелец');
 if(write&&(segment==='cash'||segment==='payments'||segment==='return-credits'||path.endsWith('/settle')||path.match(/^\/receipts\/[^/]+\/pay$/))&&!p.cash)throw ApiError.forbiddenRequest('Не разрешена запись денежных выплат');
 if(segment==='cash'&&!p.finance)throw ApiError.forbiddenRequest('Финансовый журнал закрыт');
 let effectiveDate=req.body?.date||req.body?.payload?.date;
 let approvedPastOutput=false;
 if(write&&path.endsWith('/post')&&segment==='productions'){const id=path.split('/')[2];effectiveDate=(await M.Production.findByPk(id))?.date;approvedPastOutput=!!await M.WageRequest.findOne({where:{type:'late_production',status:'approved',productionId:id}});}
 if(write&&path.endsWith('/post')&&segment==='stock-counts')effectiveDate=(await M.StockCount.findByPk(path.split('/')[2]))?.date;
 if(write&&['receipts','receipt-drafts'].includes(segment)){
  let payload=req.body?.payload||req.body;if(segment==='receipt-drafts'&&path.endsWith('/post')&&!req.body?.payload)payload=(await M.ReceiptDraft.findByPk(path.split('/')[2]))?.payload||{};
  effectiveDate=payload?.date||effectiveDate;
  if((payload?.initialPayment||payload?.paid)&&!p.cash)throw ApiError.forbiddenRequest('Приход доступен без записи оплаты. Оплату оформляет уполномоченный пользователь');
 }
 if(write&&!p.pastDates&&!approvedPastOutput){const value=effectiveDate,now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda'}).format(new Date());if((value&&value<now||req.body?.month&&req.body.month<now.slice(0,7))&&!path.includes('/cancel'))throw ApiError.forbiddenRequest('Операцию прошлой датой согласует владелец');}
}
function project(data,a){
 if(!a||a.owner)return {...data,permissions:a?.permissions||all,isOwner:!!a?.owner};
 const result={...data,permissions:a.permissions,isOwner:false};delete result.moneyPersonal;
 if(!a.permissions.finance){result.returns=(result.returns||[]).map(r=>({...r,settlements:[]}));}
 if(!a.permissions.finance)for(const key of ['incomes','outcomes','cashEntries','tradeTotals','receiptPaidAmounts','expenseMeta','expenseDecisions','expenseReversals','costEvents','stockValues'])delete result[key];
 if(!a.permissions.payroll){for(const key of ['payroll','payments','payrollAdvances','payees'])result[key]=[];result.workPolicies=(result.workPolicies||[]).map(p=>({id:p.id,userId:p.userId,startsOn:p.startsOn,mode:p.mode}));result.workProfiles=(result.workProfiles||[]).map(p=>({userId:p.userId,position:p.position}));result.repAccruals=(result.repAccruals||[]).map(r=>({month:r.month,delta:r.delta}));result.dailyPay=(result.dailyPay||[]).map(r=>({date:r.date,amount:r.amount,status:r.status}));result.wageAdjustments=(result.wageAdjustments||[]).map(r=>({date:r.date,amount:r.amount}));result.payrollPaymentInfo=a.permissions.finance?(result.payrollPaymentInfo||[]).map(r=>({outcomeId:r.outcomeId,method:r.method,actorName:r.actorName})):[];}
 if(!a.permissions.users)result.users=(result.users||[]).map(u=>({id:u.id,name:u.name,role:u.role}));
 return result;
}
module.exports={defaults,all,access,cloudAccess,owner,list,set,create,authorize,project,resolve};
