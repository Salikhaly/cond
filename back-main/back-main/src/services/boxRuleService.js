const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError'),{selectFilm}=require('../domain/filmSelection');
const lock=42810318,round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
const num=(v,label,zero=false)=>{const n=Number(typeof v==='string'?v.trim().replace(',','.'):v);if(v==null||v===''||!Number.isFinite(n)||(zero?n<0:n<=0)||n>1000000||Math.abs(n-round(n))>1e-8)throw ApiError.badRequest('Проверьте: '+label);return n;};
const plain=p=>p?.toJSON?p.toJSON():p;
function effective(pack,rule){return rule?{...plain(pack),filmQtyM:Number(rule.filmQtyM),filmMaterialId:rule.filmMaterialId||null,sharedPackaging:true}:plain(pack);}
async function ensureProduct(product,t,rules){
 rules=rules||await M.BoxRule.findAll({order:[['capacityKg','ASC']],transaction:t});const price=await M.SellingPrice.findByPk(product.id,{transaction:t});
 for(const r of rules){const box=await M.Material.findByPk(r.boxMaterialId,{transaction:t});if(!box?.active)continue;const [pack]=await M.ProductPack.findOrCreate({where:{productId:product.id,boxMaterialId:box.id},defaults:{capacityKg:r.capacityKg,filmQtyM:0,salePrice:price==null?null:Math.round(Number(price.price)*Number(r.capacityKg)*100)/100,laborPerBox:round(Number(product.priceForEmployee)*Number(r.capacityKg)),overheadPerBox:0,active:true},transaction:t});await M.PackStock.findOrCreate({where:{packId:pack.id},defaults:{boxes:0,reservedBoxes:0},transaction:t});}
 return rules.length;
}
async function save(user,id,b){
 if(user.role!=='super_admin')throw ApiError.forbiddenRequest();
 return db.transaction(async t=>{
  await db.query('SELECT pg_advisory_xact_lock('+lock+')',{transaction:t});
  const products=await Product.findAll({where:{is_active:true},order:[['id','ASC']],transaction:t,lock:t.LOCK.UPDATE});
  let box=id?await M.Material.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE}):null;
  const capacityKg=num(b.capacityKg??box?.capacityKg,'вес коробки'),filmQtyM=num(b.filmQtyM??0,'метры плёнки на коробку',true);
  if(id&&(!box||box.kind!=='box'||!box.active))throw ApiError.badRequest('Выберите действующую пустую коробку');
  if(box&&Number(box.capacityKg)>0&&Number(box.capacityKg)!==capacityKg)throw ApiError.badRequest('Вес существующей коробки сохраняется. Для другого веса добавьте коробку');
  if(!box){const name=String(b.name||'Коробка '+String(capacityKg).replace('.',',')+' кг').trim();if(!name||name.length>250)throw ApiError.badRequest('Укажите название коробки');const [found]=await M.Material.findOrCreate({where:{name},defaults:{kind:'box',unit:'шт',capacityKg,quantity:0,unitCost:0},transaction:t});box=await M.Material.findByPk(found.id,{transaction:t,lock:t.LOCK.UPDATE});if(box.kind!=='box'||!box.active||Number(box.capacityKg)!==capacityKg)throw ApiError.badRequest('Такое название уже используется другим материалом');}
  const current=await M.BoxRule.findByPk(box.id,{transaction:t,lock:t.LOCK.UPDATE}),same=await M.BoxRule.findOne({where:{capacityKg},transaction:t});if(same&&same.boxMaterialId!==box.id)throw ApiError.badRequest('Для этого веса упаковка уже настроена. Измените существующую коробку');
  if(current&&Number(b.expectedVersion)!==current.version)throw new ApiError(409,'Настройка коробки уже изменена. Откройте её заново');
  if(!Number(box.capacityKg)){const linked=await M.ProductPack.findAll({where:{boxMaterialId:box.id},transaction:t});if(linked.some(p=>Number(p.capacityKg)!==capacityKg))throw ApiError.badRequest('Эта коробка уже связана с другим весом. Добавьте отдельную коробку');await box.update({capacityKg},{transaction:t});}
  if(b.name&&b.name!==box.name){const name=String(b.name).trim();if(!name||name.length>250)throw ApiError.badRequest('Укажите название коробки');if(await M.Material.findOne({where:{name},transaction:t}))throw ApiError.badRequest('Материал с таким названием уже есть');await box.update({name},{transaction:t});}
  const films=await M.Material.findAll({where:{kind:'film',active:true},transaction:t}),film=selectFilm({filmMaterialId:b.filmMaterialId||null},films);if((filmQtyM>0||b.filmMaterialId)&&!film)throw ApiError.badRequest('Выберите плёнку со склада');
  const values={capacityKg,filmMaterialId:filmQtyM>0?film.id:null,filmQtyM,version:(current?.version||0)+1,actorId:user.id,actorName:user.name};
  const rule=current?await current.update(values,{transaction:t}):await M.BoxRule.create({boxMaterialId:box.id,...values},{transaction:t});
  for(const product of products)await ensureProduct(product,t,[rule]);
  return {...rule.toJSON(),id:box.id,products:products.length};
 });
}
module.exports={save,effective,ensureProduct,lock};
