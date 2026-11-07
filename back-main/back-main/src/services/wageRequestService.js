const db=require('../database/sequelize'),M=require('../models/operations'),{User,Product,Salary}=require('../models/models'),{Op}=require('sequelize'),ApiError=require('../exceptions/ApiError'),D=require('./businessDay');
const fail=m=>{throw ApiError.badRequest(m);},money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function amount(v){const n=Number(v);if(!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||Math.abs(n)>1e7||Math.abs(n-money(n))>1e-8)fail('Проверьте сумму корректировки');return money(n);}
function reason(v){if(typeof v!=='string'||!v.trim()||v.length>2000)fail('Укажите причину');return v.trim();}
async function rights(u,type,t){if(u.role!=='super_admin')throw ApiError.forbiddenRequest();const a=await require('./authorityService').access(u,t);if(!a.owner&&!a.permissions[type==='late_production'?'production':'payroll'])throw ApiError.forbiddenRequest('Нет полномочий для этого запроса');return a;}
async function event(u,r,action,before,note,t){return M.WageRequestEvent.create({requestId:r.id,action,before,after:r.toJSON(),reason:note||'',actorId:u.id,actorName:u.name},{transaction:t});}
async function locked(id,t){const initial=await M.WageRequest.findByPk(id,{transaction:t});if(!initial)throw ApiError.notFound('Запрос не найден');await User.findByPk(initial.userId,{transaction:t,lock:t.LOCK.UPDATE});return M.WageRequest.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});}
async function salaryDelta(userId,date,delta,t){
 const bounds=require('./payrollPeriod')(date.slice(0,7));let s=await Salary.findOne({where:{userId,is_active:true,date:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}},transaction:t,lock:t.LOCK.UPDATE});if(!s)s=await Salary.create({userId,total_amount:0,date:bounds.start},{transaction:t});
 if(Math.abs(Number(s.total_amount)+delta)>99999999.99)fail('Начисления превышают предел зарплатного журнала');await s.increment('total_amount',{by:delta,transaction:t});return s;
}
async function create(u,b){
 if(!['super_admin','employee','representative'].includes(u.role))throw ApiError.forbiddenRequest();
 if(!['late_production','adjustment','policy','daily_basis','attendance','monthly_commission'].includes(b.type))fail('Выберите вид запроса');
 const userId=u.role==='super_admin'?Number(b.userId):u.id;if(b.userId!=null&&Number(b.userId)!==userId)throw ApiError.forbiddenRequest();
 const date=D.date(b.date),note=reason(b.reason);
 return db.transaction(async t=>{
  const target=await User.findByPk(userId,{transaction:t,lock:t.LOCK.UPDATE});if(!target||!['employee','representative'].includes(target.role))fail('Сотрудник не найден');
  if(u.role==='super_admin')await rights(u,b.type,t);
  let payload,status=u.role==='super_admin'?'awaiting_employee':'submitted';
  if(b.type==='late_production'){
   if(target.role!=='employee'||date>=D.today())fail('Запрос нужен для фактического выпуска за предыдущий день');
   const p=await Product.findByPk(Number(b.payload?.productId),{transaction:t});if(!p||!p.is_active)fail('Выберите действующий товар');
   const variant=await M.PackagingVariant.findByPk(p.id,{transaction:t}),pack=require('./packagingService').quantity(variant,b.payload||{}),kg=pack?.kg??Number(b.payload?.kg);
   if(!Number.isFinite(kg)||kg<=0||kg>1e9||Math.abs(kg-Math.round(kg*10000)/10000)>1e-8)fail('Проверьте фактический выпуск');
   payload={productId:p.id,productName:p.name,kg,...(pack?{packages:pack.packages}:{}),workerId:userId,date};status='submitted';
  }
  if(b.type==='adjustment'){if(date>D.today())fail('Будущая зарплата оформляется правилом, а выдача вперёд — авансом');const delta=amount(b.payload?.amount);if(delta===0)fail('Укажите изменение, отличное от нуля');payload={amount:delta};}
  if(b.type==='attendance'){if(date>D.today()||!require('../domain/workAttendance').statuses.includes(b.payload?.status))fail('Укажите прошедший день и его статус');const day=await M.WorkDay.findOne({where:{userId,date},transaction:t});payload={status:b.payload.status,oldToken:day?day.updatedAt.toISOString():null,before:day?.toJSON()||null};}
  if(b.type==='policy'){if(u.role!=='super_admin')throw ApiError.forbiddenRequest();payload=await require('./workPolicyService').validate(userId,{...b.payload,startsOn:date},t);}
  if(b.type==='monthly_commission'){
   if(u.role!=='super_admin')throw ApiError.forbiddenRequest();const form={...b.payload,userId};if(form.mode==='profit')await require('./authorityService').owner(u,t);const calculation=await require('./representativePayrollService').calculation(form,t);if(form.month!==date.slice(0,7))fail('Месяц расчёта не соответствует запросу');payload={form,calculation};
   const prior=(await M.WageRequest.findAll({where:{userId,type:b.type,status:{[Op.in]:['awaiting_employee','agreed','disputed']}},transaction:t})).find(r=>r.payload.calculation.fingerprint===calculation.fingerprint);if(prior)return prior;
  }
  if(b.type==='daily_basis'){
   if(u.role!=='super_admin')throw ApiError.forbiddenRequest();const daily=await M.DailyPay.findByPk(b.payload?.dailyId,{transaction:t,lock:t.LOCK.UPDATE});if(!daily||daily.userId!==userId||daily.mode!=='margin'||daily.date!==date)fail('Выберите расчёт процента от маржи за указанную дату');payload={dailyId:daily.id,basis:amount(b.payload?.basis),sourceFingerprint:daily.snapshot?.sourceFingerprint};
  }
  const r=await M.WageRequest.create({userId,date,type:b.type,payload,proposal:status==='awaiting_employee'?payload:null,reason:note,status,createdBy:u.id,createdByName:u.name},{transaction:t});await event(u,r,'created',null,note,t);return r;
 });
}
async function reply(u,id,b){
 return db.transaction(async t=>{const r=await locked(id,t);if(r.userId!==u.id||!['employee','representative'].includes(u.role))throw ApiError.forbiddenRequest();if(r.status!=='awaiting_employee')fail('Этот запрос не ожидает ответа');if(!['agree','dispute'].includes(b.response))fail('Выберите ответ');const note=b.response==='dispute'?reason(b.comment):String(b.comment||'Согласен').slice(0,2000),before=r.toJSON();await r.update({status:b.response==='agree'?'agreed':'disputed',employeeReply:note},{transaction:t});await event(u,r,b.response,before,note,t);return r;});
}
async function propose(u,id,b){
 return db.transaction(async t=>{const r=await locked(id,t);await rights(u,r.type,t);if(r.status!=='submitted'||!['adjustment','attendance'].includes(r.type))fail('Сейчас нельзя предложить исправление');const before=r.toJSON();let proposal;if(r.type==='adjustment'){const delta=amount(b.amount);if(!delta)fail('Укажите сумму изменения');proposal={amount:delta};}else{const day=await M.WorkDay.findOne({where:{userId:r.userId,date:r.date},transaction:t}),status=b.status||r.payload.status;if(!require('../domain/workAttendance').statuses.includes(status))fail('Укажите статус дня');proposal={status,oldToken:day?day.updatedAt.toISOString():null,before:day?.toJSON()||null};}await r.update({proposal,status:'awaiting_employee',decisionReason:reason(b.reason)},{transaction:t});await event(u,r,'proposed',before,b.reason,t);return r;});
}
async function post(u,id,b){
 return db.transaction(async t=>{
  const r=await locked(id,t),a=await rights(u,r.type,t),before=r.toJSON();
  if(['posted','approved','rejected','cancelled','superseded'].includes(r.status))fail('Запрос уже завершён');
  if(r.type!=='late_production'&&r.date<D.today()&&!a.owner&&!a.permissions.pastDates)throw ApiError.forbiddenRequest('Прошлую дату согласует владелец или уполномоченный администратор');
  if(r.status==='submitted'&&r.createdBy===r.userId&&['adjustment','attendance'].includes(r.type)&&b.acceptOriginal===true){await r.update({proposal:r.payload,status:'agreed',employeeReply:'Принят первоначальный запрос, созданный самим сотрудником'},{transaction:t});await event(u,r,'accepted_original',before,'Данные запроса сотрудника приняты без изменения',t);}
  if(r.type!=='late_production'&&!['agreed','disputed'].includes(r.status))fail('Сначала сотрудник отвечает на предложение');
  if(r.status==='disputed'&&!a.owner)throw ApiError.forbiddenRequest('Спор решает владелец. Возражение сотрудника останется в истории');
  const note=r.status==='disputed'?reason(b.reason):String(b.reason||'Согласовано').slice(0,2000);
  if(r.type==='late_production'){
   const production=await require('./operationsService').production(u,r.payload,t);await r.update({status:'approved',productionId:production.id,decidedBy:u.id,decidedByName:u.name,decisionReason:note,postedAt:new Date()},{transaction:t});
  }else{
   if(r.type==='policy')await require('./workPolicyService').activate(r,u,t);
   if(r.type==='adjustment'){const delta=amount((r.proposal||r.payload).amount);await salaryDelta(r.userId,r.date,delta,t);await M.WageAdjustment.create({requestId:r.id,userId:r.userId,date:r.date,amount:delta,reason:r.reason,actorId:u.id,actorName:u.name},{transaction:t});}
   if(r.type==='attendance'){
    const proposed=r.proposal||r.payload,day=await M.WorkDay.findOne({where:{userId:r.userId,date:r.date},transaction:t,lock:t.LOCK.UPDATE});
    if((day?day.updatedAt.toISOString():null)!==proposed.oldToken)throw new ApiError(409,'Отметка дня изменилась после согласования. Нужен актуальный запрос');
    if(proposed.status!=='worked'&&await M.Production.findOne({where:{workerId:r.userId,date:r.date,status:'posted'},transaction:t}))fail('За день есть проведённый выпуск. Он подтверждает работу; исправляется отдельной корректировкой учёта');

    if(day&&require('../domain/workAttendance').attendance(day)!==proposed.status)await M.LegacyLink.upsert({id:'work-day-pay:'+day.id,data:{amount:null,actorId:u.id}},{transaction:t});
    const values={userId:r.userId,date:r.date,status:proposed.status,comment:r.reason.slice(0,250),confirmedBy:u.id,confirmedName:u.name};if(day)await day.update(values,{transaction:t});else await M.WorkDay.create({...values,actorId:r.createdBy,actorName:r.createdByName},{transaction:t});
    await require('./dailyPayService').recompute(r.userId,r.date,u,t,{authorizedReduction:true,approvalRequestId:r.id});
   }
   if(r.type==='daily_reduction')await require('./dailyPayService').approveReduction(r,u,t);
   if(r.type==='daily_basis')await require('./dailyPayService').approveBasis(r,u,t);
   if(r.type==='monthly_commission')await require('./representativePayrollService').post(u,{...r.payload.form,fingerprint:r.payload.calculation.fingerprint},t);
   await r.update({status:'posted',decidedBy:u.id,decidedByName:u.name,decisionReason:note,postedAt:new Date()},{transaction:t});
   if(r.type==='policy')await require('./dailyPayService').recomputeRange(r.userId,r.date,D.today(),u,t);
  }
  await event(u,r,'posted',before,note,t);return r;
 });
}
async function reject(u,id,b){
 return db.transaction(async t=>{const r=await locked(id,t),before=r.toJSON();if(u.role==='super_admin'){const a=await rights(u,r.type,t);if(r.status==='disputed'&&!a.owner)throw ApiError.forbiddenRequest('Спор решает владелец');}else if(r.userId!==u.id||r.createdBy!==u.id||r.status!=='submitted')throw ApiError.forbiddenRequest();
  if(['posted','approved','rejected','cancelled','superseded'].includes(r.status))fail('Запрос уже завершён');const note=reason(b.reason);
  if(r.type==='daily_reduction'){const a=await require('./authorityService').access(u,t);if(!a.owner)throw ApiError.forbiddenRequest('Сохранить прежнее начисление при изменившейся базе может владелец');await require('./dailyPayService').keepRecognized(r,u,t);}
  await r.update({status:u.role==='super_admin'?'rejected':'cancelled',decisionReason:note,decidedBy:u.id,decidedByName:u.name},{transaction:t});await event(u,r,'rejected',before,note,t);return r;
 });
}
async function reduction(daily,calc,u,t){
 const existing=await M.WageRequest.findAll({where:{dailyId:daily.id,type:'daily_reduction',status:{[Op.in]:['awaiting_employee','agreed','disputed']}},transaction:t,lock:t.LOCK.UPDATE});
 const fingerprint=calc.fingerprint;if(existing.some(r=>r.payload.fingerprint===fingerprint))return;
 for(const r of existing){const before=r.toJSON();await r.update({status:'superseded',decisionReason:'База расчёта изменилась до проведения'},{transaction:t});await event(u,r,'superseded',before,'Расчёт обновлён',t);}
 const payload={dailyId:daily.id,fingerprint,targetAmount:calc.total,previousAmount:Number(daily.amount),delta:money(calc.total-Number(daily.amount))};
 const r=await M.WageRequest.create({userId:daily.userId,date:daily.date,type:'daily_reduction',payload,proposal:payload,dailyId:daily.id,status:'awaiting_employee',reason:'Изменение процента после возврата или исправления базы продаж',createdBy:u.id,createdByName:u.name},{transaction:t});await event(u,r,'created',null,r.reason,t);
}
async function visible(u,t){
 let where={userId:u.id};if(u.role==='super_admin'){const a=await require('./authorityService').access(u,t);where=a.owner||a.permissions.payroll?{}:{type:'late_production'};}
 const requests=await M.WageRequest.findAll({where,order:[['createdAt','DESC']],transaction:t}),requestEvents=await M.WageRequestEvent.findAll({where:{requestId:requests.map(r=>r.id)},order:[['createdAt','DESC']],transaction:t});return {wageRequests:requests,wageRequestEvents:requestEvents};
}
module.exports={create,reply,propose,post,reject,reduction,visible,salaryDelta,event,locked,rights};
