const {createHash,createHmac,randomUUID}=require('node:crypto'),{Op}=require('sequelize'),db=require('../database/sequelize'),M=require('../models/operations'),S=require('../models/storeCatalog'),{Product,User}=require('../models/models'),ApiError=require('../exceptions/ApiError'),{priceForPack}=require('../domain/catalogPrice');
const digest=value=>createHash('sha256').update(value).digest('hex');
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const unavailable=()=>ApiError.unauthorizedRequest('Ссылка недействительна. Попросите магазин или представителя получить новую.');
async function ownerOutlet(user,id,t){await require('./authorityService').owner(user);if(!uuid(id))throw ApiError.badRequest('Выберите магазин');const outlet=await M.Outlet.findByPk(id,{transaction:t,lock:t?.LOCK.UPDATE});if(!outlet?.active)throw ApiError.notFound('Магазин не найден');return outlet;}
function recover(link){if(!link||!process.env.SECRET_KEY)return null;const token=createHmac('sha384',process.env.SECRET_KEY).update('store-catalog:'+link.createdBy+':'+link.outletId+':'+link.id).digest('base64url');return digest(token)===link.tokenHash?token:null;}
async function status(user,outletId){await ownerOutlet(user,outletId);const link=await S.Link.findOne({where:{outletId,active:true},order:[['createdAt','DESC']]});return {active:Boolean(link),id:link?.id||null,createdAt:link?.createdAt||null,token:recover(link)};}
async function issue(user,outletId,requestId=randomUUID()){
 if(!uuid(requestId))throw ApiError.badRequest('Проверьте номер операции');requestId=requestId.toLowerCase();
 if(!process.env.SECRET_KEY)throw new ApiError(503,'Создание ссылок временно недоступно');
 return db.transaction(async t=>{
  await ownerOutlet(user,outletId,t);
  const token=createHmac('sha384',process.env.SECRET_KEY).update('store-catalog:'+user.id+':'+outletId+':'+requestId).digest('base64url'),prior=await S.Link.findByPk(requestId,{transaction:t,lock:t.LOCK.UPDATE});
  if(prior){if(prior.outletId!==outletId||prior.createdBy!==user.id||!prior.active||prior.tokenHash!==digest(token))throw new ApiError(409,'Эта ссылка уже заменена. Создайте новую ссылку.');return {id:prior.id,active:true,token,createdAt:prior.createdAt};}
  await S.Link.update({active:false,revokedBy:user.id,revokedAt:new Date()},{where:{outletId,active:true},transaction:t});
  const link=await S.Link.create({id:requestId,outletId,tokenHash:digest(token),createdBy:user.id},{transaction:t});
  await M.Audit.create({actorId:user.id,actorName:user.name,role:user.role,method:'POST',path:'/outlets/'+outletId+'/catalog-link',entityId:link.id,operationId:requestId},{transaction:t});
  return {id:link.id,active:true,token,createdAt:link.createdAt};
 });
}
async function revoke(user,outletId){return db.transaction(async t=>{await ownerOutlet(user,outletId,t);await S.Link.update({active:false,revokedBy:user.id,revokedAt:new Date()},{where:{outletId,active:true},transaction:t});return {active:false};});}
async function authenticate(header){const match=/^Bearer ([a-zA-Z0-9_-]{64})$/.exec(header||'');if(!match)throw unavailable();const link=await S.Link.findOne({where:{tokenHash:digest(match[1]),active:true}});if(!link)throw unavailable();const outlet=await M.Outlet.findByPk(link.outletId);if(!outlet?.active)throw unavailable();return {link,outlet};}
let lastCleanup=0;
async function limit(context,ip,kind='read'){
 const now=Date.now(),minute=Math.floor(now/60000),day=Math.floor(now/86400000),policies=kind==='order'?[[context.link.id+':order:'+minute,10,60000],[context.link.id+':day:'+day,200,86400000],['ip:'+digest(ip)+':order:'+minute,30,60000]]:[['ip:'+digest(ip)+':'+kind+':'+minute,kind==='image'?300:120,60000]];
 for(const [key,max,duration]of policies){const [rows]=await db.query('INSERT INTO store_catalog_rates (key,hits,"expiresAt","createdAt","updatedAt") VALUES (:key,1,:expires,now(),now()) ON CONFLICT (key) DO UPDATE SET hits=store_catalog_rates.hits+1,"updatedAt"=now() RETURNING hits',{replacements:{key,expires:new Date(now+duration)}});if(Number(rows[0].hits)>max)throw new ApiError(429,'Слишком много запросов. Повторите через минуту.');}
 if(now-lastCleanup>600000){lastCleanup=now;await S.Rate.destroy({where:{expiresAt:{[Op.lt]:new Date(now-86400000)}}});}
}
function date(value){const day=value||require('./businessDay').today(),today=require('./businessDay').today();if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00Z'))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day||day<today||Date.parse(day)-Date.parse(today)>90*86400000)throw ApiError.badRequest('Выберите дату поставки от сегодня до 90 дней вперёд');return day;}
async function load(context,onDate){
 const outlet=await M.Outlet.findByPk(context.outlet.id);if(!outlet?.active)throw unavailable();
 const displays=await M.ProductDisplay.findAll({where:{catalogVisible:true},attributes:['productId','description','catalogGroup','sortOrder','photoVersion',[require('sequelize').literal("length(COALESCE(photo,'')) > 0"),'hasPhoto']],raw:true});
 const products=await Product.findAll({where:{id:displays.map(d=>d.productId),is_active:true},attributes:['id','name','image','additional'],raw:true}),ids=products.map(p=>p.id);
 const [packs,stocks,rules,standards]=await Promise.all([M.ProductPack.findAll({where:{productId:ids,active:true},raw:true}),M.PackStock.findAll({raw:true}),M.ClientPrice.findAll({where:{customerId:outlet.customerId,startsOn:{[Op.lte]:onDate}},raw:true}),M.SellingPrice.findAll({where:{productId:ids},raw:true})]);
 const rows=products.map(p=>{const display=displays.find(d=>d.productId===p.id),verified=p.additional?.stockVerified!==false;return {id:p.id,name:p.name,description:display.description,group:display.catalogGroup,sortOrder:display.sortOrder,hasPhoto:display.hasPhoto,photoVersion:display.photoVersion,image:/^\/products\/[a-z0-9_.-]+\.(?:jpg|png|webp)$/i.test(p.image||'')?p.image:'',packs:packs.filter(pack=>pack.productId===p.id).sort((a,b)=>Number(a.capacityKg)-Number(b.capacityKg)).map(pack=>{const stock=stocks.find(s=>s.packId===pack.id);return {id:pack.id,capacityKg:Number(pack.capacityKg),price:priceForPack({rules,productId:p.id,customerId:outlet.customerId,outletId:outlet.id,onDate,pack,standardPrice:standards.find(s=>s.productId===p.id)?.price}),availability:!verified?'unknown':Number(stock?.boxes||0)-Number(stock?.reservedBoxes||0)>0?'available':'order'};})};}).filter(p=>p.packs.length).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name,'ru')||a.id-b.id);
 return {outlet,rows};
}
async function catalog(context,query={}){
 const onDate=date(query.date),{outlet,rows}=await load(context,onDate),q=String(query.q||'').slice(0,150).toLocaleLowerCase('ru').replace(/ё/g,'е'),group=String(query.group||'').slice(0,120),offset=Math.max(0,Math.min(100000,Number.parseInt(query.offset)||0));
 const shown=rows.filter(p=>(!q||(p.name+' '+p.description).toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q))&&(!group||p.group===group));
 const cartIds=String(query.cart||'').split(',').filter(uuid).slice(0,100);
 return {cartProducts:rows.filter(p=>p.packs.some(pack=>cartIds.includes(pack.id))),shop:{name:outlet.name,address:outlet.address},date:onDate,groups:[...new Set(rows.map(p=>p.group).filter(Boolean))],products:shown.slice(offset,offset+24),total:shown.length,nextOffset:offset+24<shown.length?offset+24:null};
}
async function media(context,id,size){if(!Number.isSafeInteger(Number(id)))throw ApiError.notFound();if(!await M.ProductDisplay.findOne({where:{productId:id,catalogVisible:true}}))throw ApiError.notFound('Фото не найдено');return require('./productDisplayService').media(id,size);}
async function submit(context,body){
 return require('./idempotency').transaction(async t=>{
  const link=await S.Link.findByPk(context.link.id,{transaction:t,lock:t.LOCK.UPDATE});if(!link?.active)throw unavailable();
  const deliveryDate=date(body.deliveryDate);if(!Array.isArray(body.lines)||!body.lines.length||body.lines.length>100)throw ApiError.badRequest('Добавьте товары в корзину');
  if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>1000))throw ApiError.badRequest('Комментарий — до 1000 символов');
  const {outlet,rows}=await load(context,deliveryDate),lines=[];
  for(const item of body.lines){const product=rows.find(p=>p.packs.some(pack=>pack.id===item.packId)),pack=product?.packs.find(p=>p.id===item.packId);if(!pack)throw new ApiError(409,'Товар больше недоступен. Обновите корзину.');if(!Number.isSafeInteger(Number(item.boxes))||Number(item.boxes)<1||Number(item.boxes)>10000)throw ApiError.badRequest('Укажите целое количество коробок от 1 до 10 000');
   if(!Object.hasOwn(item,'quotedPrice')||(item.quotedPrice!==null&&(!Number.isFinite(Number(item.quotedPrice))||item.quotedPrice===''))||pack.price!==null&&Math.abs(Number(item.quotedPrice)-pack.price)>.001||pack.price===null&&item.quotedPrice!==null||pack.price!==null&&item.quotedPrice===null)throw new ApiError(409,'Цена изменилась. Обновите корзину и проверьте сумму.');
   lines.push({productId:product.id,packId:pack.id,boxes:Number(item.boxes),quotedPrice:pack.price});
  }
  const owner=await User.findByPk(link.createdBy,{transaction:t});if(!owner||owner.role!=='super_admin'||(await M.Access.findByPk(owner.id,{transaction:t}))?.disabled)throw ApiError.forbiddenRequest('Приём заказов по ссылке приостановлен. Свяжитесь с представителем.');
  const order=await require('./operationsService').order({...owner.toJSON(),name:'Магазин «'+outlet.name+'»'},{outletId:outlet.id,deliveryDate,note:'По ссылке магазина'+(body.note?' · '+body.note:''),lines:lines.map(({quotedPrice,...line})=>line)});
  for(const line of order.lines){const requested=lines.find(l=>l.packId===line.packId);if(line.price!==requested.quotedPrice)throw new ApiError(409,'Цена изменилась. Обновите корзину и проверьте сумму.');}
  await S.Origin.create({orderId:order.id,linkId:link.id,outletId:outlet.id,representativeId:order.userId},{transaction:t});
  return {id:order.id,number:order.id.slice(0,8).toUpperCase(),status:'submitted',total:Number(order.total),priceComplete:order.lines.every(l=>l.price!==null),deliveryDate:order.deliveryDate};
 });
}
module.exports={status,issue,revoke,authenticate,limit,catalog,media,submit,date};
