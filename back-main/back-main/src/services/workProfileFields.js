const ApiError=require('../exceptions/ApiError');
module.exports=b=>{
 const fields={};for(const [key,max] of Object.entries({position:250,phone:80,instagram:250,tiktok:250,note:2000,photo:750000})){const value=b[key]??'';if(typeof value!=='string'||value.length>max)throw ApiError.badRequest('Проверьте данные профиля сотрудника');fields[key]=value.trim();}
 for(const key of ['instagram','tiktok']){const raw=fields[key];if(!raw)continue;const username=raw.replace(/^@/,'');if(/^[a-z0-9_.]+$/i.test(username))fields[key]='https://'+(key==='instagram'?'instagram.com/':'tiktok.com/@')+username;else{try{const link=new URL(raw);if(link.protocol==='https:'&&['www.'+key+'.com',key+'.com'].includes(link.hostname)&&!link.username&&!link.password)fields[key]='https://'+key+'.com'+link.pathname;}catch{}}}
 if(fields.photo&&!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(fields.photo))throw ApiError.badRequest('Фото — JPG, PNG или WebP');
 if(fields.instagram&&!/^https:\/\/(?:www\.)?instagram\.com\/[a-z0-9_.]+\/?$/i.test(fields.instagram))throw ApiError.badRequest('Instagram — ссылка вида https://instagram.com/имя');
 if(fields.tiktok&&!/^https:\/\/(?:www\.)?tiktok\.com\/@[a-z0-9_.]+\/?$/i.test(fields.tiktok))throw ApiError.badRequest('TikTok — ссылка вида https://tiktok.com/@имя');
 if(b.individualRate!==undefined){if(b.individualRate===null||b.individualRate==='')fields.individualRate=null;else{const n=Number(b.individualRate);if(!['string','number'].includes(typeof b.individualRate)||!Number.isFinite(n)||n<0||n>1e7||Math.abs(n*100-Math.round(n*100))>1e-6)throw ApiError.badRequest('Проверьте индивидуальную ставку');fields.individualRate=Math.round((n+Number.EPSILON)*100)/100;}}
 if(b.parents!==undefined){
  if(!b.parents||typeof b.parents!=='object'||Array.isArray(b.parents))throw ApiError.badRequest('Проверьте данные родителей');
  const limits={fatherName:250,fatherPhone:80,motherName:250,motherPhone:80,address:500,note:1000},parents={};
  for(const [key,max] of Object.entries(limits)){const value=b.parents[key]??'';if(typeof value!=='string'||value.length>max)throw ApiError.badRequest('Проверьте данные родителей');parents[key]=value.trim();}
  fields.parents=parents;
 }
 const weekDays=b.weekDays??[];if(!Array.isArray(weekDays)||weekDays.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(weekDays).size!==weekDays.length)throw ApiError.badRequest('Проверьте график');return {...fields,weekDays};
};
