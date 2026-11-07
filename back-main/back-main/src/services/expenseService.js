const db=require('../database/sequelize'),M=require('../models/operations'),{User,Outcome,OutcomeCategory}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
const text=(v,label,required=false,max=250)=>{if(v==null)v='';if(typeof v!=='string'||v.length>max||required&&!v.trim())throw ApiError.badRequest('Укажите '+label);return v.trim();};
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
async function metadata(u,b,t,legacy=false){
 b=await require('./expenseArticleService').resolve(b,t);
 if(!['operating','inventory','asset','payroll','owner'].includes(b.kind))throw ApiError.badRequest('Выберите вид расхода');
 const method=b.method||'unknown';if(!['cash','kaspi','bank',...(legacy?['unknown']:[])].includes(method))throw ApiError.badRequest('Выберите способ оплаты');
 const person=b.responsibleId?await User.findByPk(b.responsibleId,{transaction:t}):null;if(b.responsibleId&&!person)throw ApiError.badRequest('Ответственный не найден');
 const category=text(b.category,'категорию',true),subcategory=text(b.subcategory,'подкатегорию'),costGroup=b.costGroup||(/^(свет|электричество|электроэнергия)$/i.test(subcategory)?'electricity':/^вода$/i.test(subcategory)?'water':'business');
 if(!['electricity','water','business','packaging'].includes(costGroup))throw ApiError.badRequest('Укажите вид затрат: свет, вода или другие расходы бизнеса');
 return {articleId:b.articleId||null,kind:b.kind,category,subcategory,costGroup,method,comment:text(b.comment,'комментарий',false,2000),responsibleId:person?.id||null,responsibleName:person?.name||text(b.responsibleName,'ответственного'),actorId:u.id,actorName:u.name};
}
async function create(u,b){
 admin(u);const amount=Number(b.amount);if(!['number','string'].includes(typeof b.amount)||!Number.isFinite(amount)||amount<=0||amount>99999999.99||Math.abs(amount-money(amount))>1e-8)throw ApiError.badRequest('Проверьте сумму расхода');
 if(['inventory','payroll'].includes(b.kind))throw ApiError.badRequest('Запасы оформляются через приход, зарплата — через выплату сотруднику');
 const date=b.date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw ApiError.badRequest('Проверьте дату');
 return db.transaction(async t=>{
  // Backward compatible callers without explicit kind keep an unknown classification.
  b=await require('./expenseArticleService').resolve(b,t);
  const meta=b.kind?await metadata(u,b,t):null;
  const [category]=await OutcomeCategory.findOrCreate({where:{name:text(b.category,'категорию',true)},transaction:t});
  const outcome=await Outcome.create({recipient:text(b.recipient,'получателя',true),name:text(b.name,'назначение',true),unitPrice:amount,quantity:1,totalAmount:amount,outcomeCategoryId:category.id,date},{transaction:t});
  if(meta){await M.ExpenseMeta.create({outcomeId:outcome.id,...meta},{transaction:t});await M.ExpenseDecision.create({outcomeId:outcome.id,before:null,after:meta,reason:'Создание расхода',actorId:u.id,actorName:u.name},{transaction:t});}
  await require('./moneyService').assign('outcome:'+outcome.id,b,u,t);
  return outcome;
 });
}
async function classify(u,id,b){
 admin(u);return db.transaction(async t=>{
  const outcome=await Outcome.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!outcome)throw ApiError.notFound('Расход не найден');
  const reversals=await M.ExpenseReversal.findAll({transaction:t});if(reversals.some(r=>String(r.outcomeId)===String(id)||String(r.reversalId)===String(id)))throw ApiError.badRequest('Отменённый расход сохраняет исходную классификацию');
  if(outcome.advanceId||await M.CashEntry.findOne({where:{outcomeId:outcome.id},transaction:t})||await M.ReturnSettlement.findOne({where:{outcomeId:outcome.id},transaction:t}))throw ApiError.badRequest('Связанная выплата учитывается по исходному документу');
  const links=await M.LegacyLink.findAll({transaction:t});if(links.some(l=>l.id.startsWith('receipt:')&&String(l.data.outcomeId)===String(outcome.id)))throw ApiError.badRequest('Приход уже учтён в стоимости запасов');
  const reason=text(b.reason,'причину классификации',true,2000),meta=await metadata(u,b,t,true),previous=await M.ExpenseMeta.findByPk(id,{transaction:t});
  await M.ExpenseDecision.create({outcomeId:outcome.id,before:previous?.toJSON()||null,after:meta,reason,actorId:u.id,actorName:u.name},{transaction:t});
  await M.ExpenseMeta.upsert({outcomeId:outcome.id,...meta},{transaction:t});return {outcomeId:outcome.id,...meta};
 });
}
async function reverse(u,id,b){
 admin(u);const reason=text(b.reason,'причину отмены',true,2000),date=b.date;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw ApiError.badRequest('Укажите дату исправления');
 return db.transaction(async t=>{
  const original=await Outcome.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!original||Number(original.totalAmount)<=0)throw ApiError.badRequest('Выберите исходный расход');
  if(await M.ExpenseReversal.findByPk(id,{transaction:t}))throw ApiError.badRequest('Расход уже отменён');
  const meta=await M.ExpenseMeta.findByPk(id,{transaction:t});if(!meta)throw ApiError.badRequest('Сначала разберите старый расход: укажите, как его учитывать');
  if(original.advanceId||await M.CashEntry.findOne({where:{outcomeId:original.id},transaction:t})||await M.ReturnSettlement.findOne({where:{outcomeId:original.id},transaction:t})||(await M.LegacyLink.findAll({transaction:t})).some(l=>l.id.startsWith('receipt:')&&String(l.data.outcomeId)===String(id)))throw ApiError.badRequest('Отмените выплату через исходный документ');
  const value=-Number(original.totalAmount),out=await Outcome.create({recipient:original.recipient,name:'Отмена расхода: '+original.name.slice(0,200),unitPrice:value,quantity:1,totalAmount:value,outcomeCategoryId:original.outcomeCategoryId,date},{transaction:t});
  const snapshot={...meta.toJSON(),outcomeId:out.id,createdAt:undefined,updatedAt:undefined,actorId:u.id,actorName:u.name,comment:'Отмена: '+reason};
  await require('./moneyService').copyAssignment('outcome:'+original.id,'outcome:'+out.id,u,t);
  await M.ExpenseMeta.create(snapshot,{transaction:t});await M.ExpenseDecision.create({outcomeId:out.id,before:null,after:snapshot,reason,actorId:u.id,actorName:u.name},{transaction:t});
  return M.ExpenseReversal.create({outcomeId:original.id,reversalId:out.id,reason,actorId:u.id,actorName:u.name},{transaction:t});
 });
}
module.exports={create,classify,reverse};
