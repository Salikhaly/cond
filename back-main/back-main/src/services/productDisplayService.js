const db=require('../database/sequelize'),M=require('../models/operations'),{Product}=require('../models/models'),ApiError=require('../exceptions/ApiError');
function image(value,limit,label){
 if(typeof value!=='string')throw ApiError.badRequest('Проверьте '+label);
 if(!value)return '';
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw ApiError.badRequest('Фото: JPG, PNG или WebP');
 const bytes=Buffer.from(match[2],'base64');
 const signature=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!signature||bytes.length<24||bytes.length>limit)throw ApiError.badRequest(label+' — неверный формат или слишком большой размер');
 return value;
}
function text(value,max,label){if(typeof value!=='string'||value.trim().length>max)throw ApiError.badRequest('Проверьте '+label);return value.trim();}
async function display(user,id,b){
 if(user.role!=='super_admin')throw ApiError.forbiddenRequest();
 if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw ApiError.badRequest('Выберите товар');
 const product=await Product.findByPk(id);if(!product||!product.is_active)throw ApiError.notFound('Товар не найден');
 const values={};
 if(b.description!==undefined)values.description=text(b.description,1500,'описание');
 if(b.photo!==undefined){values.photo=image(b.photo,400000,'Фото');values.thumbnail=b.photo?image(b.thumbnail??'',60000,'Миниатюра'):'';}
 if(b.catalogGroup!==undefined)values.catalogGroup=text(b.catalogGroup,120,'группу товаров');
 if(b.sortOrder!==undefined){if(!Number.isSafeInteger(Number(b.sortOrder))||Math.abs(Number(b.sortOrder))>100000)throw ApiError.badRequest('Проверьте порядок показа');values.sortOrder=Number(b.sortOrder);}
 if(b.catalogVisible!==undefined){if(typeof b.catalogVisible!=='boolean')throw ApiError.badRequest('Проверьте публикацию');values.catalogVisible=b.catalogVisible;}
 return db.transaction(async transaction=>{
  const [card]=await M.ProductDisplay.findOrCreate({where:{productId:product.id},transaction});await card.reload({transaction,lock:transaction.LOCK.UPDATE});
  if(b.expectedPhotoVersion!==undefined&&Number(b.expectedPhotoVersion)!==Number(card.photoVersion))throw new ApiError(409,'Фото уже изменено. Откройте актуальную карточку перед заменой.');
  if(b.photo!==undefined)values.photoVersion=Number(card.photoVersion)+1;
  return card.update(values,{transaction});
 });
}
async function media(id,size){
 if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw ApiError.notFound();
 const card=await M.ProductDisplay.findByPk(id),product=await Product.findByPk(id);
 if(!product?.is_active||!card?.photo)throw ApiError.notFound('Фото не найдено');
 const value=size==='full'?card.photo:card.thumbnail||card.photo;
 const match=/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(value);if(!match)throw ApiError.notFound('Фото не найдено');
 return {type:match[1],bytes:Buffer.from(match[2],'base64')};
}
module.exports={display,media,image};
