const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError');
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
const number=(v,label,zero=false)=>{const n=Number(v);if(!['string','number'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||(zero?n<0:n<=0)||n>1000000||Math.abs(n-Math.round(n*10000)/10000)>1e-8)throw ApiError.badRequest('Проверьте: '+label);return n;};
function validateRecipe(variant,outputKg,lines){
 if(!variant)return;
 const source=lines.find(l=>l.materialId===variant.sourceId);
 if(!source||Math.abs(Number(source.quantity)-Number(outputKg))>.00001)throw ApiError.badRequest('Фасовка: расход исходного товара должен равняться выходу в кг');
 const packages=Number(outputKg)/Number(variant.kgPerPack);
 if(Math.abs(packages-Math.round(packages))>1e-7)throw ApiError.badRequest('Калькуляция фасовки должна содержать целое число упаковок');
}
function quantity(variant,b){
 if(!variant){if(b.packages!=null&&b.packages!=='')throw ApiError.badRequest('Выбранный товар не является вариантом фасовки');return null;}
 const size=Number(variant.kgPerPack),packages=b.packages!=null&&b.packages!==''?number(b.packages,'число упаковок'):number(b.kg,'выход')/size;
 if(!Number.isInteger(packages)||packages>1000000)throw ApiError.badRequest('Укажите целое число упаковок');
 const kg=Math.round(packages*size*10000)/10000;
 if(b.kg!=null&&b.kg!==''&&Math.abs(Number(b.kg)-kg)>.00001)throw ApiError.badRequest('Масса не соответствует количеству упаковок');
 return {kg,packages};
}
async function create(user,b){
 admin(user);
 if(!Array.isArray(b.variants)||!b.variants.length||b.variants.length>20)throw ApiError.badRequest('Добавьте варианты фасовки');
 return db.transaction(async t=>{
  const source=await M.Material.findByPk(b.sourceId,{transaction:t,lock:t.LOCK.UPDATE});if(!source||!source.active||source.unit!=='кг')throw ApiError.badRequest('Выберите исходный товар с единицей кг');
  const rows=[];
  for(const v of [...b.variants].sort((a,b)=>Number(a.kgPerPack)-Number(b.kgPerPack))){
   const size=number(v.kgPerPack,'вес упаковки'),labor=number(v.laborPerPack??0,'работа за упаковку',true),overhead=number(v.overheadPerPack??0,'прочие затраты',true);
   if(size>1000||await M.PackagingVariant.findOne({where:{sourceId:source.id,kgPerPack:size,laborPerPack:labor},transaction:t}))throw ApiError.badRequest('Такой вариант уже существует или вес слишком большой');
   const extras=v.lines||[];if(!Array.isArray(extras)||extras.length>30)throw ApiError.badRequest('Проверьте состав упаковки');
   const lines=[{materialId:source.id,quantity:size},...extras.map(l=>({materialId:l.materialId,quantity:number(l.quantity,'расход упаковки')}))];
   if(new Set(lines.map(l=>l.materialId)).size!==lines.length||await M.Material.count({where:{id:lines.map(l=>l.materialId),active:true},transaction:t})!==lines.length)throw ApiError.badRequest('Состав содержит повтор или недоступный материал');
   const name=String(v.name||source.name+' — '+String(size).replace('.',',')+' кг').trim();if(!name||name.length>250)throw ApiError.badRequest('Проверьте название');
   const rate=Math.round(labor/size*10000)/10000;
   const p=await Product.create({name,weight:size,priceForEmployee:rate,ingredients:[],additional:[],weightTotal:0,quantity:0,priceTotal:0},{transaction:t});
   await M.Stock.create({productId:p.id},{transaction:t});
   await M.PackagingVariant.create({productId:p.id,sourceId:source.id,kgPerPack:size,laborPerPack:labor},{transaction:t});
   await M.Recipe.create({productId:p.id,outputKg:size,lines,overhead,version:1},{transaction:t});
   if(v.salePerKg!==undefined&&v.salePerKg!=='')await M.SellingPrice.create({productId:p.id,price:Math.round(number(v.salePerKg,'цена за кг',true)*100)/100},{transaction:t});
   const calc=await require('./operationsService').calculate(p.id,size,t);await p.update({priceTotal:Math.round(calc.costPerKg*100)/100},{transaction:t});rows.push(p);
  }
  return rows;
 });
}
module.exports={create,quantity,validateRecipe};
