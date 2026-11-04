const M=require('../models/operations'),{User}=require('../models/models'),{Op}=require('sequelize'),ApiError=require('../exceptions/ApiError'),D=require('./businessDay');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function amount(v,label){const n=Number(v??0);if(!['string','number'].includes(typeof(v??0))||!Number.isFinite(n)||n<0||n>1e7||Math.abs(n-money(n))>1e-8)throw ApiError.badRequest('Проверьте '+label);return money(n);}
async function validate(userId,b,t){
 const target=await User.findByPk(userId,{transaction:t});if(!target||!['employee','representative'].includes(target.role))throw ApiError.badRequest('Выберите работника или представителя');
 const startsOn=D.date(b.startsOn);if(!['piece','shift','sales','margin','custom','monthly','monthly_piece'].includes(b.mode))throw ApiError.badRequest('Выберите способ начисления');
 if(['monthly','monthly_piece'].includes(b.mode)&&!startsOn.endsWith('-01'))throw ApiError.badRequest('Месячный оклад начинается с первого числа месяца');
 if(target.role==='representative'&&['piece','monthly_piece'].includes(b.mode))throw ApiError.badRequest('Сдельная выработка применяется к работнику производства');
 const boxRate=b.mode==='monthly_piece'?amount(b.boxRate,'ставку за коробку'):0;
 const percent=amount(b.percent,'процент'),shiftRate=amount(b.shiftRate,'ставку смены'),fixedDay=amount(b.fixedDay,'фиксированную часть дня'),monthlySalary=amount(b.monthlySalary,'оклад'),advanceAmount=amount(b.advanceAmount,'аванс по графику');if(percent>100)throw ApiError.badRequest('Процент не больше 100');if(b.advanceDay!=null&&(!Number.isInteger(Number(b.advanceDay))||Number(b.advanceDay)<1||Number(b.advanceDay)>31))throw ApiError.badRequest('День аванса — от 1 до 31');
 const pieceRates=b.pieceRates||[];if(!Array.isArray(pieceRates)||pieceRates.length>100||new Set(pieceRates.map(r=>Number(r.productId))).size!==pieceRates.length)throw ApiError.badRequest('Проверьте ставки по товарам');
 const normalized=[];for(const r of pieceRates){const product=await require('../models/models').Product.findByPk(Number(r.productId),{transaction:t});if(!product||!product.is_active||!['kg','pack'].includes(r.unit))throw ApiError.badRequest('Выберите товар и единицу ставки');if(r.unit==='pack'&&!await M.PackagingVariant.findByPk(product.id,{transaction:t}))throw ApiError.badRequest('Ставка за пачку доступна для варианта фасовки');normalized.push({productId:product.id,name:product.name,unit:r.unit,rate:amount(r.rate,'ставку работнику')});}
 const scope=target.role==='representative'?'assigned':'all';return {userId:target.id,startsOn,mode:b.mode,boxRate,percent,shiftRate,fixedDay,monthlySalary,advanceAmount,advanceDay:b.advanceDay==null?null:Number(b.advanceDay),scope,pieceRates:normalized,attendanceRequired:b.attendanceRequired===undefined?target.role==='employee':b.attendanceRequired===true};
}
async function at(userId,date,t){return M.WorkPolicy.findOne({where:{userId,startsOn:{[Op.lte]:date}},order:[['startsOn','DESC']],transaction:t});}
async function activate(request,actor,t){
 const b=await validate(request.userId,request.proposal||request.payload,t);
 if(await M.WorkPolicy.findOne({where:{userId:b.userId,startsOn:{[Op.gte]:b.startsOn}},transaction:t}))throw ApiError.badRequest('Уже есть правило с этой или более поздней даты');
 if(await M.Production.findOne({where:{workerId:b.userId,status:{[Op.in]:['draft','posted']},date:{[Op.gte]:b.startsOn}},transaction:t})||await M.DailyPay.findOne({where:{userId:b.userId,date:{[Op.gte]:b.startsOn}},transaction:t})||await M.WageAdjustment.findOne({where:{userId:b.userId,date:{[Op.gte]:b.startsOn}},transaction:t}))throw ApiError.badRequest('За эти дни уже есть записи или начисления. Начните новое правило со следующего свободного дня');
 const monthly=await M.RepAccrual.findOne({where:{userId:b.userId,month:{[Op.gte]:b.startsOn.slice(0,7)}},transaction:t});if(monthly&&!['monthly','monthly_piece'].includes(b.mode))throw ApiError.badRequest('В этом месяце уже начислялся месячный оклад и процент. Начните ежедневные правила со следующего месяца');
 return M.WorkPolicy.create({...b,requestId:request.id,actorId:actor.id,actorName:actor.name},{transaction:t});
}
module.exports={at,validate,activate};
