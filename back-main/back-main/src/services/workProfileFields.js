const ApiError=require('../exceptions/ApiError');
module.exports=b=>{
 const fields={};for(const [key,max] of Object.entries({position:250,phone:80,instagram:250,tiktok:250,note:2000,photo:750000})){const value=b[key]??'';if(typeof value!=='string'||value.length>max)throw ApiError.badRequest('Проверьте данные профиля сотрудника');fields[key]=value.trim();}
 for(const key of ['instagram','tiktok']){const raw=fields[key];if(!raw)continue;const username=raw.replace(/^@/,'');if(/^[a-z0-9_.]+$/i.test(username))fields[key]='https://'+(key==='instagram'?'instagram.com/':'tiktok.com/@')+username;else{try{const link=new URL(raw);if(link.protocol==='https:'&&['www.'+key+'.com',key+'.com'].includes(link.hostname)&&!link.username&&!link.password)fields[key]='https://'+key+'.com'+link.pathname;}catch{}}}
 if(fields.photo&&!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(fields.photo))throw ApiError.badRequest('Фото — JPG, PNG или WebP');
 if(fields.instagram&&!/^https:\/\/(?:www\.)?instagram\.com\/[a-z0-9_.]+\/?$/i.test(fields.instagram))throw ApiError.badRequest('Instagram — ссылка вида https://instagram.com/имя');
 if(fields.tiktok&&!/^https:\/\/(?:www\.)?tiktok\.com\/@[a-z0-9_.]+\/?$/i.test(fields.tiktok))throw ApiError.badRequest('TikTok — ссылка вида https://tiktok.com/@имя');
 const weekDays=b.weekDays??[];if(!Array.isArray(weekDays)||weekDays.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(weekDays).size!==weekDays.length)throw ApiError.badRequest('Проверьте график');return {...fields,weekDays};
};
