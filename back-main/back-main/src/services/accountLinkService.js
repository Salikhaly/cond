const crypto=require('crypto'),bcrypt=require('bcrypt'),{Op}=require('sequelize');
const db=require('../database/sequelize'),Link=require('../models/accountLink'),M=require('../models/operations'),{User,Token}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const digest=token=>crypto.createHash('sha256').update(token).digest('hex');
const emailOf=value=>{const email=String(value||'').trim().toLowerCase();if(email.length>250||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw ApiError.badRequest('Укажите email');return email;};
function configured(){return ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','CLIENT_URL'].every(key=>!!process.env[key]);}
async function send(email,kind,userId,payload){
 if(!configured())throw new ApiError(503,'Отправка писем пока не настроена. Обратитесь к администратору');
 const token=crypto.randomBytes(32).toString('hex'),hash=digest(token),expiresAt=new Date(Date.now()+(kind==='invite'?48*3600:30*60)*1000);
 const created=await db.transaction(async transaction=>{
  // Serialize by email, including invitations for users who do not exist yet.
  await db.query('SELECT pg_advisory_xact_lock(hashtext(:email))',{replacements:{email:'account-link:'+email},transaction});
  if(await Link.count({where:{email,createdAt:{[Op.gte]:new Date(Date.now()-60000)}},transaction}))return false;
  await Link.update({usedAt:new Date()},{where:{email,kind,usedAt:null},transaction});
  await Link.create({hash,kind,email,userId,payload,expiresAt},{transaction});return true;
 });
 if(!created)return;
 const url=new URL('/',process.env.CLIENT_URL);url.hash=new URLSearchParams({'account-token':token,action:kind}).toString();
 try{await require('./mailService/mailService').sendAccountLink(email,url.toString(),kind);}
 catch(error){await Link.update({usedAt:new Date()},{where:{hash}});throw new ApiError(503,'Не удалось отправить письмо. Попробуйте позже или обратитесь к администратору');}
}
async function request(b){
 const email=emailOf(b.email);
 if(!configured())throw new ApiError(503,'Отправка писем пока не настроена. Обратитесь к администратору');
 const user=await User.findOne({where:{email}});
 if(user&&!(await M.Access.findByPk(user.id))?.disabled)await send(email,'reset',user.id,null);
 return {message:'Если аккаунт существует, письмо со ссылкой придёт на почту. Проверьте также «Спам».'};
}
async function invite(actor,b){
 await require('./authorityService').owner(actor);
 const email=emailOf(b.email),name=String(b.name||'').trim();
 if(!name||name.length>250||!['employee','representative'].includes(b.role))throw ApiError.badRequest('Укажите имя и роль сотрудника');
 if(await User.findOne({where:{email}}))throw ApiError.badRequest('Этот email уже используется. Для смены пароля выберите «Забыли пароль?»');
 await send(email,'invite',null,{name,role:b.role});return {message:'Приглашение отправлено. Ссылка действует 48 часов'};
}
async function complete(b){
 if(typeof b.token!=='string'||!/^[0-9a-f]{64}$/.test(b.token))throw ApiError.badRequest('Ссылка недействительна или устарела');
 if(typeof b.password!=='string'||b.password.length<10||Buffer.byteLength(b.password,'utf8')>72)throw ApiError.badRequest('Пароль — от 10 символов, не более 72 байт');
 const password=await bcrypt.hash(b.password,10);
 return db.transaction(async transaction=>{
  const link=await Link.findByPk(digest(b.token),{transaction,lock:transaction.LOCK.UPDATE});
  if(!link||link.usedAt||link.expiresAt<=new Date())throw ApiError.badRequest('Ссылка недействительна или устарела. Запросите новую');
  if(link.kind==='invite'){
   const user=await User.create({email:link.email,name:link.payload.name,role:link.payload.role,password,email_confirmed:new Date()},{transaction});
   await M.Access.create({userId:user.id,disabled:false,productionOrders:false},{transaction});
  }else{
   const user=await User.findByPk(link.userId,{transaction,lock:transaction.LOCK.UPDATE});
   if(!user||user.email!==link.email||(await M.Access.findByPk(user.id,{transaction}))?.disabled)throw ApiError.badRequest('Ссылка недействительна или доступ закрыт');
   await user.update({password},{transaction});await Token.destroy({where:{userId:user.id},transaction});
   await Link.update({usedAt:new Date()},{where:{userId:user.id,usedAt:null},transaction});
  }
  await link.update({usedAt:new Date()},{transaction});return {message:'Пароль сохранён. Войдите с email и новым паролем'};
 });
}
module.exports={request,invite,complete,configured};
