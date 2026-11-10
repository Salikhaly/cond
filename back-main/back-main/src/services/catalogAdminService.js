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
    const packs=await M.ProductPack.findAll({where:{productId:p.id},transaction:t}),packStocks=await M.PackStock.findAll({where:{packId:packs.map(x=>x.id)},transaction:t,lock:t.LOCK.UPDATE});if(packStocks.some(s=>Math.abs(Number(s.boxes))>.00001||Math.abs(Number(s.reservedBoxes))>.00001))throw new ApiError(409,'Сначала закройте остатки и резервы коробок');
    if(Math.abs(Number(stock?.kg??p.weightTotal))>.00001||Number(stock?.reservedKg)>0)throw new ApiError(409,'Сначала закройте остаток продукции на складе');
    const returns=await M.GoodsReturn.findAll({where:{status:{[Op.in]:['requested','posted']}},transaction:t});
    for(const r of returns){const line=r.lines.find(l=>l.productId===p.id);if(r.status==='requested'&&(line||r.replacements.some(l=>l.productId===p.id)))throw new ApiError(409,'Есть запрос на возврат или обмен этого товара');if(line&&r.status==='posted'){const done=await M.ReturnDisposition.sum('kg',{where:{returnId:r.id,productId:p.id},transaction:t});if(Number(done||0)<line.kg-.00001)throw new ApiError(409,'Возврат этого товара находится на проверке');}}
    const orders=await M.Order.findAll({where:{status:{[Op.in]:['submitted','approved']}},transaction:t});
    if(orders.some(o=>o.lines.some(l=>l.productId===p.id))||await M.Production.count({where:{productId:p.id,status:'draft'},transaction:t}))throw new ApiError(409,'Есть незавершённые заявки или выпуски по этому товару');
   }
   return p.update({is_active:b.active},{transaction:t});
  }
  if(!p.is_active)throw ApiError.badRequest('Сначала восстановите товар из архива');
  await require('./manualCostService').save(user,p.id,b,t);
  const weight=number(b.weight),rate=number(b.priceForEmployee,true),previousRate=Number(p.priceForEmployee);
  const pricePerKg = b.pricePerKg!==undefined
   ? (b.pricePerKg===''||b.pricePerKg===null?null:number(b.pricePerKg,true))
   : b.salePrice!==undefined ? (b.salePrice===''||b.salePrice===null?null:number(b.salePrice,true)/weight) : undefined;
  const variant=await M.PackagingVariant.findByPk(p.id,{transaction:t});
  const rateLocked=await M.Production.count({where:{productId:p.id,status:{[Op.in]:['draft','posted']}},transaction:t});
  if(rateLocked&&(rate!==Number(p.priceForEmployee)||variant&&b.packLaborPerPack!==undefined&&Number(b.packLaborPerPack)!==Number(variant.laborPerPack)))throw ApiError.badRequest('Оплата уже использованного товара меняется через согласованное правило сотрудника');
  if(variant&&Math.abs(weight-Number(variant.kgPerPack))>.00001)throw ApiError.badRequest('Для другого веса создайте отдельный вариант фасовки. Вес существующего варианта сохраняется');
  if(variant&&b.packLaborPerPack!==undefined)await variant.update({laborPerPack:number(b.packLaborPerPack,true)},{transaction:t});
  await p.update({name:name(b.name),weight,priceForEmployee:rate,quantity:Math.floor((Number(p.weightTotal)+1e-8)/weight)},{transaction:t});
  if(rate!==previousRate)for(const pack of await M.ProductPack.findAll({where:{productId:p.id},transaction:t}))await pack.update({laborPerBox:Math.round(rate*Number(pack.capacityKg)*100)/100},{transaction:t});
  const currentPrice=await M.SellingPrice.findByPk(p.id,{transaction:t});
  if(pricePerKg!==undefined&&pricePerKg!==null&&(!currentPrice||Number(currentPrice.price)!==Math.round(pricePerKg*100)/100)){
   await M.SellingPrice.upsert({productId:p.id,price:Math.round(pricePerKg*100)/100},{transaction:t});
   const packs=await M.ProductPack.findAll({where:{productId:p.id},transaction:t});
   for(const pack of packs)await pack.update({salePrice:Math.round(pricePerKg*Number(pack.capacityKg)*100)/100},{transaction:t});
  }
  if(b.filmQtyM!==undefined){
   const filmQty=b.filmQtyM===''||b.filmQtyM===null?0:number(b.filmQtyM,true);
   await M.ProductPack.update({filmQtyM:filmQty},{where:{productId:p.id},transaction:t});
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
   if(!b.active){if(Math.abs(Number(m.quantity))>.00001)throw new ApiError(409,'Сначала закройте остаток материала');if(m.kind==='box'&&await M.ProductPack.count({where:{boxMaterialId:m.id,active:true},transaction:t}))throw new ApiError(409,'Коробка используется в товаре. Сначала удалите тип коробки у товара');const recipes=await M.Recipe.findAll({where:{active:true},transaction:t});if(recipes.some(r=>r.lines.some(l=>l.materialId===m.id)))throw new ApiError(409,'Материал используется в рецептуре. Сначала измените состав');}
   return m.update({active:b.active},{transaction:t});
  }
  const values={};
  if(b.name!==undefined)values.name=name(b.name);
  if(b.packUnit!==undefined)values.packUnit=optionalText(b.packUnit,'единицу упаковки',32);
  if(b.unitsPerPack!==undefined)values.unitsPerPack=b.unitsPerPack===null||b.unitsPerPack===''?null:number(b.unitsPerPack);
  if(b.kind!==undefined){if(!['raw','box','film'].includes(b.kind))throw ApiError.badRequest('Неверный тип материала');values.kind=b.kind;}
  if(b.unit!==undefined){if(!['кг','л','шт','м'].includes(b.unit))throw ApiError.badRequest('Неверная единица');values.unit=b.unit;}
  if(b.capacityKg!==undefined)values.capacityKg=b.capacityKg===null||b.capacityKg===''?null:number(b.capacityKg);
  if(b.unitCost!==undefined){
   const price=b.unitCost===null||b.unitCost===''?0:number(b.unitCost,true);
   if(price!==Number(m.unitCost)&&(Number(m.quantity)>0||await M.Receipt.count({where:{materialId:m.id},transaction:t})))throw ApiError.badRequest('Цена берётся из приходов. Исправьте приход отдельной корректировкой');
   values.unitCost=price;if(Number(m.quantity)===0&&!await M.Receipt.count({where:{materialId:m.id},transaction:t}))values.costComplete=price>0?true:null;
  }
  if(!Object.keys(values).length)throw ApiError.badRequest('Нет данных для сохранения');
  return m.update(values,{transaction:t});
 });}
};
