const db=require('../database/sequelize'),M=require('../models/operations');
const {Product}=require('../models/models');
const ApiError=require('../exceptions/ApiError');
const {Op}=require('sequelize');
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest('Только администратор');};
const name=v=>{if(typeof v!=='string'||!v.trim()||v.length>250)throw ApiError.badRequest('Укажите название');return v.trim();};
const number=(v,zero=false)=>{const n=Number(v);if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||(zero?n<0:n<=0)||n>1e9||Math.abs(n-Math.round(n*10000)/10000)>1e-8)throw ApiError.badRequest('Проверьте вес и ставку');return n;};
const optionalText=(v,label,max)=>{if(v===undefined)return undefined;if(v===null||v==='')return null;if(typeof v!=='string'||!v.trim()||v.length>max)throw ApiError.badRequest('Проверьте '+label);return v.trim();};
module.exports={
 async product(user,id,b){admin(user);return db.transaction(async t=>{
  const p=await Product.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!p)throw ApiError.notFound('Товар не найден');
  if(b.active!==undefined){
   if(typeof b.active!=='boolean')throw ApiError.badRequest('Укажите состояние товара');
   const stock=await M.Stock.findByPk(p.id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!b.active){
    if(Number(stock?.kg||p.weightTotal)>0||Number(stock?.reservedKg)>0)throw new ApiError(409,'На складе есть продукция. Сначала отгрузите или спишите остаток');
    const returns=await M.GoodsReturn.findAll({where:{status:{[Op.in]:['requested','posted']}},transaction:t});
    for(const r of returns){const line=r.lines.find(l=>l.productId===p.id);if(r.status==='requested'&&(line||r.replacements.some(l=>l.productId===p.id)))throw new ApiError(409,'Есть запрос на возврат или обмен этого товара');if(line&&r.status==='posted'){const done=await M.ReturnDisposition.sum('kg',{where:{returnId:r.id,productId:p.id},transaction:t});if(Number(done||0)<line.kg-.00001)throw new ApiError(409,'Возврат этого товара находится на проверке');}}
    const orders=await M.Order.findAll({where:{status:{[Op.in]:['submitted','approved']}},transaction:t});
    if(orders.some(o=>o.lines.some(l=>l.productId===p.id))||await M.Production.count({where:{productId:p.id,status:'draft'},transaction:t}))throw new ApiError(409,'Есть незавершённые заявки или выпуски по этому товару');
   }
   return p.update({is_active:b.active},{transaction:t});
  }
  if(!p.is_active)throw ApiError.badRequest('Сначала восстановите товар из архива');
  const weight=number(b.weight),rate=number(b.priceForEmployee,true);
  const variant=await M.PackagingVariant.findByPk(p.id,{transaction:t});
  const rateLocked=await M.Production.count({where:{productId:p.id,status:{[Op.in]:['draft','posted']}},transaction:t});
  if(rateLocked&&(rate!==Number(p.priceForEmployee)||variant&&b.packLaborPerPack!==undefined&&Number(b.packLaborPerPack)!==Number(variant.laborPerPack)))throw ApiError.badRequest('Оплата уже использованного товара меняется через согласованное правило сотрудника');
  if(variant&&Math.abs(weight-Number(variant.kgPerPack))>.00001)throw ApiError.badRequest('Для другого веса создайте отдельный вариант фасовки. Вес существующего варианта сохраняется');
  if(variant&&b.packLaborPerPack!==undefined)await variant.update({laborPerPack:number(b.packLaborPerPack,true)},{transaction:t});
  await p.update({name:name(b.name),weight,priceForEmployee:rate,quantity:Math.floor((Number(p.weightTotal)+1e-8)/weight)},{transaction:t});
  const defaultPack=await M.ProductPack.findOne({where:{productId:p.id},order:[['capacityKg','ASC']],transaction:t});
  if(defaultPack){
   const values={capacityKg:weight,laborPerBox:Math.round(rate*weight*100)/100};
   if(b.salePrice!==undefined)values.salePrice=b.salePrice===''||b.salePrice===null?null:Math.round(number(b.salePrice,true)*100)/100;
   await defaultPack.update(values,{transaction:t});
  }
  if(await M.Recipe.findOne({where:{productId:p.id,active:true},transaction:t})){
   const calc=await require('./operationsService').calculate(p.id,Number((await M.Recipe.findOne({where:{productId:p.id},transaction:t})).outputKg),t);
   await p.update({priceTotal:Math.round((calc.costPerKg+Number.EPSILON)*100)/100},{transaction:t});
  }
  if(b.photo!==undefined||b.description!==undefined)await require('./tradeService').display(user,p.id,b);
  return p;
 });},
 async recipe(user,productId,b){admin(user);if(typeof b.active!=='boolean')throw ApiError.badRequest('Укажите состояние рецептуры');return db.transaction(async t=>{
  const p=await Product.findByPk(productId,{transaction:t,lock:t.LOCK.UPDATE});if(!p)throw ApiError.notFound('Товар не найден');
  const r=await M.Recipe.findOne({where:{productId:p.id},transaction:t,lock:t.LOCK.UPDATE});if(!r)throw ApiError.notFound('Рецептура не найдена');
  if(b.active&&!p.is_active)throw ApiError.badRequest('Сначала восстановите товар');
  if(b.active&&await M.Material.count({where:{id:r.lines.map(l=>l.materialId),active:true},transaction:t})!==r.lines.length)throw ApiError.badRequest('Сначала восстановите материалы рецептуры');
  return r.update({active:b.active,version:r.version+1},{transaction:t});
 });},
 async material(user,id,b){admin(user);return db.transaction(async t=>{
  const m=await M.Material.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!m)throw ApiError.notFound('Материал не найден');
  if(b.active!==undefined){
   if(typeof b.active!=='boolean')throw ApiError.badRequest('Укажите состояние материала');
   if(!b.active){if(Number(m.quantity)>0)throw new ApiError(409,'Материал ещё есть на складе');const recipes=await M.Recipe.findAll({where:{active:true},transaction:t});if(recipes.some(r=>r.lines.some(l=>l.materialId===m.id)))throw new ApiError(409,'Материал используется в рецептуре. Сначала измените состав');}
   return m.update({active:b.active},{transaction:t});
  }
  const values={};
  if(b.name!==undefined)values.name=name(b.name);
  if(b.packUnit!==undefined)values.packUnit=optionalText(b.packUnit,'единицу упаковки',32);
  if(b.unitsPerPack!==undefined)values.unitsPerPack=b.unitsPerPack===null||b.unitsPerPack===''?null:number(b.unitsPerPack);
  if(b.kind!==undefined){if(!['raw','box','film'].includes(b.kind))throw ApiError.badRequest('Неверный тип материала');values.kind=b.kind;}
  if(b.unit!==undefined){if(!['кг','л','шт','м'].includes(b.unit))throw ApiError.badRequest('Неверная единица');values.unit=b.unit;}
  if(b.capacityKg!==undefined)values.capacityKg=b.capacityKg===null||b.capacityKg===''?null:number(b.capacityKg);
  if(b.unitCost!==undefined)values.unitCost=b.unitCost===null||b.unitCost===''?0:number(b.unitCost,true);
  if(!Object.keys(values).length)throw ApiError.badRequest('Нет данных для сохранения');
  return m.update(values,{transaction:t});
 });}
};
