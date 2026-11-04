const db=require('../database/sequelize'),M=require('../models/operations'),{User}=require('../models/models'),{Op}=require('sequelize'),{createHash}=require('crypto'),ApiError=require('../exceptions/ApiError'),D=require('./businessDay');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100,hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function calculation(userId,date,t){
 const policy=await require('./workPolicyService').at(userId,date,t);if(!policy||['piece','custom','monthly','monthly_piece'].includes(policy.mode))return null;
 const work=await M.WorkDay.findOne({where:{userId,date},transaction:t}),productions=await M.Production.findAll({where:{workerId:userId,date,status:'posted'},attributes:['id'],transaction:t}),person=await User.findByPk(userId,{attributes:['role'],transaction:t}),worked=productions.length>0||person?.role!=='employee'&&work?.status==='worked';
 if(policy.mode==='shift'){
  const source={policyId:policy.id,mode:'shift',worked,shiftRate:Number(policy.shiftRate)},sourceFingerprint=hash(source),daily=await M.DailyPay.findOne({where:{userId,date},transaction:t});
  const override=daily?.override?.sourceFingerprint===sourceFingerprint&&daily.override.kind==='amount'?daily.override:null,total=override?Number(override.amount):worked?Number(policy.shiftRate):0;
  return {userId,date,policyId:policy.id,mode:'shift',worked,known:true,basis:worked?1:0,percent:0,shiftRate:Number(policy.shiftRate),fixedDay:0,knownPart:total,total,source,sourceFingerprint,fingerprint:hash({sourceFingerprint,total,override}),activity:worked};
 }
 const bounds=D.bounds(date),orders=await M.Order.findAll({where:{status:'shipped',shippedAt:{[Op.gte]:bounds.start,[Op.lt]:bounds.end},...(policy.scope==='assigned'?{userId}:{})},transaction:t});
 const ownIds=policy.scope==='assigned'?(await M.Order.findAll({where:{userId},attributes:['id'],transaction:t})).map(o=>o.id):null;
 const returns=await M.GoodsReturn.findAll({where:{status:'posted',postedAt:{[Op.gte]:bounds.start,[Op.lt]:bounds.end},...(ownIds?{orderId:ownIds}:{})},transaction:t});
 const ids=[...orders.flatMap(o=>o.lines.map(l=>`shipment:${o.id}:${l.productId}`)),...returns.flatMap(r=>r.lines.map(l=>`return:${r.id}:${l.productId}`))];
 const events=ids.length?await M.CostEvent.findAll({where:{id:ids},transaction:t}):[];
 const complete=ids.every(id=>{const e=events.find(e=>e.id===id);return e&&Number(e.kg)-Number(e.knownKg)<.00011;});
 const sales=money(orders.reduce((s,o)=>s+Number(o.total),0)-returns.reduce((s,r)=>s+Number(r.total),0)),cogs=money(events.reduce((s,e)=>s+(e.kind==='shipment'?1:-1)*Number(e.value),0));
 const source={policyId:policy.id,mode:policy.mode,scope:policy.scope,shiftRate:Number(policy.shiftRate),percent:Number(policy.percent),fixedDay:Number(policy.fixedDay),attendanceRequired:policy.attendanceRequired,worked,orders:orders.map(o=>({id:o.id,total:Number(o.total)})).sort((a,b)=>a.id.localeCompare(b.id)),returns:returns.map(r=>({id:r.id,total:Number(r.total)})).sort((a,b)=>a.id.localeCompare(b.id)),costs:events.map(e=>({id:e.id,kg:Number(e.kg),knownKg:Number(e.knownKg),value:Number(e.value)})).sort((a,b)=>a.id.localeCompare(b.id))};
 const sourceFingerprint=hash(source),existing=await M.DailyPay.findOne({where:{userId,date},transaction:t}),override=existing?.override?.sourceFingerprint===sourceFingerprint?existing.override:null;
 const eligible=!policy.attendanceRequired||worked,fixed=worked?Number(policy.fixedDay):0;
 let known=policy.mode!=='margin'||complete||!eligible||Number(policy.percent)===0,basis=policy.mode==='margin'?(complete?money(sales-cogs):null):sales;
 if(override?.kind==='basis'){basis=Number(override.basis);known=true;}
 let total=policy.mode==='shift'?(worked?Number(policy.shiftRate):0):known?money(fixed+(eligible?Number(basis||0)*Number(policy.percent)/100:0)):null;
 if(override?.kind==='amount'){total=Number(override.amount);known=true;}
 const result={userId,date,policyId:policy.id,mode:policy.mode,worked,known,basis,sales,cogs:complete?cogs:null,percent:Number(policy.percent),shiftRate:Number(policy.shiftRate),fixedDay:fixed,knownPart:policy.mode==='shift'?(worked?Number(policy.shiftRate):0):fixed,total,source,sourceFingerprint,activity:worked||orders.length>0||returns.length>0};
 result.fingerprint=hash({sourceFingerprint,total,known,override:override||null});return result;
}
async function apply(daily,calc,value,status,actor,t){
 const next=money(value),delta=money(next-Number(daily.amount));if(Math.abs(next)>99999999.99)throw ApiError.badRequest('Сумма начисления превышает допустимый предел');
 if(daily.snapshot?.fingerprint===calc.fingerprint&&daily.status===status&&delta===0)return daily;
 if(delta)await require('./wageRequestService').salaryDelta(daily.userId,daily.date,delta,t);
 const version=daily.version+1;await daily.update({policyId:calc.policyId,mode:calc.mode,amount:next,proposedAmount:calc.total,status,version,snapshot:calc},{transaction:t});
 await M.DailyPayRevision.create({dailyId:daily.id,userId:daily.userId,date:daily.date,version,delta,amount:next,snapshot:calc,actorId:actor.id,actorName:actor.name},{transaction:t});return daily;
}
async function supersede(daily,actor,t){
 const rows=await M.WageRequest.findAll({where:{dailyId:daily.id,type:'daily_reduction',status:{[Op.in]:['awaiting_employee','agreed','disputed']}},transaction:t,lock:t.LOCK.UPDATE});
 for(const r of rows){const before=r.toJSON();await r.update({status:'superseded',decisionReason:'База расчёта обновилась'},{transaction:t});await require('./wageRequestService').event(actor,r,'superseded',before,'Расчёт обновлён',t);}
}
async function recompute(userId,date,actor,t,options={}){
 await User.findByPk(userId,{transaction:t,lock:t.LOCK.UPDATE});const calc=await calculation(userId,date,t);if(!calc)return null;
 let daily=await M.DailyPay.findOne({where:{userId,date},transaction:t,lock:t.LOCK.UPDATE});if(!daily&&!calc.activity)return null;
 if(!daily)daily=await M.DailyPay.create({userId,date,policyId:calc.policyId,mode:calc.mode,amount:0,status:'posted',version:0},{transaction:t});
 if(!calc.known){await supersede(daily,actor,t);return apply(daily,calc,Math.max(Number(daily.amount),calc.knownPart),'awaiting_cost',actor,t);}
 if(calc.total<Number(daily.amount)-.001&&!options.authorizedReduction){await apply(daily,calc,Number(daily.amount),'needs_confirmation',actor,t);await require('./wageRequestService').reduction(daily,calc,actor,t);return daily;}
 await supersede(daily,actor,t);return apply(daily,options.approvalRequestId?{...calc,approvalRequestId:options.approvalRequestId}:calc,calc.total,'posted',actor,t);
}
async function forDate(date,actor,t){
 const policies=await M.WorkPolicy.findAll({where:{startsOn:{[Op.lte]:date}},attributes:['userId'],group:['userId'],order:[['userId','ASC']],transaction:t});for(const p of policies)await recompute(p.userId,date,actor,t);
}
async function recomputeRange(userId,from,to,actor,t){
 if(from>to)return;const policy=await require('./workPolicyService').at(userId,to,t);if(!policy)return;
 const dates=new Set((await M.WorkDay.findAll({where:{userId,date:{[Op.between]:[from,to]}},attributes:['date'],transaction:t})).map(d=>d.date));
 for(const p of await M.Production.findAll({where:{workerId:userId,status:'posted',date:{[Op.between]:[from,to]}},attributes:['date'],transaction:t}))dates.add(p.date);
 if(['sales','margin'].includes(policy.mode)){
  const start=D.bounds(from).start,end=D.bounds(to).end;
  const orders=await M.Order.findAll({where:{status:'shipped',...(policy.scope==='assigned'?{userId}:{})},attributes:['id','shippedAt'],transaction:t});
  for(const o of orders)if(new Date(o.shippedAt)>=start&&new Date(o.shippedAt)<end)dates.add(D.day(o.shippedAt));
  for(const r of await M.GoodsReturn.findAll({where:{status:'posted',postedAt:{[Op.gte]:start,[Op.lt]:end},...(policy.scope==='assigned'?{orderId:orders.map(o=>o.id)}:{})},attributes:['postedAt'],transaction:t}))dates.add(D.day(r.postedAt));
 }
 for(const date of [...dates].sort())await recompute(userId,date,actor,t);
}
async function approveReduction(r,u,t){
 const daily=await M.DailyPay.findByPk(r.payload.dailyId,{transaction:t,lock:t.LOCK.UPDATE}),calc=daily&&await calculation(daily.userId,daily.date,t);
 if(!daily||!calc||!calc.known||calc.fingerprint!==r.payload.fingerprint||Math.abs(Number(daily.amount)-Number(r.payload.previousAmount))>.001)throw new ApiError(409,'База начисления изменилась. Нужен актуальный расчёт и ответ сотрудника');
 return apply(daily,{...calc,approvalRequestId:r.id},calc.total,'posted',u,t);
}
async function approveBasis(r,u,t){
 const daily=await M.DailyPay.findByPk(r.payload.dailyId,{transaction:t,lock:t.LOCK.UPDATE}),calc=daily&&await calculation(daily.userId,daily.date,t);
 if(!daily||!calc||calc.sourceFingerprint!==r.payload.sourceFingerprint)throw new ApiError(409,'Продажи дня изменились. Подтвердите актуальную базу');
 await daily.update({override:{kind:'basis',sourceFingerprint:calc.sourceFingerprint,basis:r.payload.basis,reason:r.reason,requestId:r.id,actorId:u.id,actorName:u.name}},{transaction:t});
 const confirmed=await calculation(daily.userId,daily.date,t);return apply(daily,{...confirmed,approvalRequestId:r.id},confirmed.total,'posted',u,t);
}
async function keepRecognized(r,u,t){
 const daily=await M.DailyPay.findByPk(r.payload.dailyId,{transaction:t,lock:t.LOCK.UPDATE}),calc=daily&&await calculation(daily.userId,daily.date,t);if(!daily||!calc||calc.fingerprint!==r.payload.fingerprint)throw new ApiError(409,'Расчёт изменился');
 await daily.update({override:{kind:'amount',amount:Number(daily.amount),sourceFingerprint:calc.sourceFingerprint,requestId:r.id,actorId:u.id,actorName:u.name}},{transaction:t});const kept=await calculation(daily.userId,daily.date,t);return apply(daily,{...kept,approvalRequestId:r.id},Number(daily.amount),'posted',u,t);
}
async function workDay(u,b){
 const admin=u.role==='super_admin',userId=admin?Number(b.userId):u.id,date=D.date(b.date);if(!admin&&!['employee','representative'].includes(u.role))throw ApiError.forbiddenRequest();if(!admin&&date!==D.today())throw ApiError.badRequest('Прошлый день исправляется запросом на согласование');
 return db.transaction(async t=>{
  const person=await User.findByPk(userId,{transaction:t,lock:t.LOCK.UPDATE});if(!person||!['employee','representative'].includes(person.role))throw ApiError.badRequest('Выберите сотрудника');if(date>D.today())throw ApiError.badRequest('Будущий день пока не отработан');
  if(person.role==='employee'&&(!admin||b.status!=='off'))throw ApiError.badRequest('Рабочий день производства подтверждается проведённым актом выработки. Отдельная отметка не нужна');
  if(b.status==='off'&&await M.Production.findOne({where:{workerId:userId,date,status:'posted'},transaction:t}))throw ApiError.badRequest('Проведённый акт подтверждает работу за день');
  if(b.status==='off'&&(typeof b.comment!=='string'||!b.comment.trim()))throw ApiError.badRequest('Укажите причину: выходной, отпуск, больничный или не вышел');
  if(admin)await require('./wageRequestService').rights(u,'policy',t);
  let row=await M.WorkDay.findOne({where:{userId,date},transaction:t,lock:t.LOCK.UPDATE});
  if(row&&row.status!=='reported'&&!admin)throw ApiError.badRequest('Подтверждённый день исправляется через согласование');
  const status=admin?(b.status==='off'?'off':'worked'):'reported',values={userId,date,status,comment:String(b.comment||'').slice(0,250),actorId:row?.actorId||u.id,actorName:row?.actorName||u.name,...(admin?{confirmedBy:u.id,confirmedName:u.name}:{})};
  if(row)await row.update(values,{transaction:t});else row=await M.WorkDay.create(values,{transaction:t});if(admin)await recompute(userId,date,u,t);return row;
 });
}
async function visible(u,t){
 const where=u.role==='super_admin'?{}:{userId:u.id},workPolicies=await M.WorkPolicy.findAll({where,order:[['startsOn','DESC']],transaction:t}),workDays=await M.WorkDay.findAll({where,transaction:t}),raw=await M.DailyPay.findAll({where,transaction:t}),wageAdjustments=await M.WageAdjustment.findAll({where,transaction:t}),workProfiles=await M.WorkProfile.findAll({where,transaction:t});
 const dailyPay=raw.map(p=>{const row=p.toJSON();if(u.role!=='super_admin'&&row.snapshot){const {source,...safe}=row.snapshot;row.snapshot=safe;}return row;});
 const safeProfiles=u.role==='super_admin'?workProfiles:workProfiles.map(profile=>{const row=profile.get({plain:true});const {parents,...safe}=row;return safe;});
 return {workPolicies,workDays,dailyPay,wageAdjustments,workProfiles:safeProfiles};
}
async function profile(u,id,b){
 await require('./wageRequestService').rights(u,'policy');return db.transaction(async t=>{
  const person=await User.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!person||!['employee','representative'].includes(person.role))throw ApiError.badRequest('Сотрудник не найден');
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>250)throw ApiError.badRequest('Укажите ФИО сотрудника');
  const fields=require('./workProfileFields')(b);await person.update({name:b.name.trim()},{transaction:t});await M.WorkProfile.upsert({userId:person.id,...fields},{transaction:t});return {id:person.id,name:person.name,...fields};
 });
}
module.exports={profile,calculation,recompute,forDate,recomputeRange,approveReduction,approveBasis,keepRecognized,workDay,visible,apply};
