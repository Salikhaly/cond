async function load(blob){const url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Не удалось открыть снимок'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
export function validateProductImage(file){
 if(!file||file.size>20*1024*1024)throw Error('Выберите фото до 20 МБ');
 if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)&&!(/\.hei[cf]$/i.test(file.name)&&!file.type))throw Error('Выберите фотографию JPG, PNG, WebP или HEIC');
}
export async function loadProductImage(file){
 validateProductImage(file);
 try{return await load(file);}catch(error){
  if(!/hei[cf]/i.test(file.type+' '+file.name))throw error;
  try{const converter=(await import(/* webpackChunkName: "heic-photo" */'heic2any')).default;const result=await converter({blob:file,toType:'image/jpeg',quality:.9});return await load(Array.isArray(result)?result[0]:result);}catch{throw Error('Этот снимок HEIC не удалось открыть. Выберите другой снимок или JPEG. Прежнее фото сохранено.');}
 }
}
function jpeg(canvas,max){for(const quality of [.88,.76,.62,.48,.32]){const value=canvas.toDataURL('image/jpeg',quality);if((value.length-value.indexOf(',')-1)*3/4<=max)return value;}throw Error('Фото слишком подробное. Выберите другой кадр.');}
export function cropProductImage(image,{x=50,y=50,rotation=0}={}){
 if(image.naturalWidth*image.naturalHeight>50000000)throw Error('Фото слишком большое. Выберите снимок меньшего размера.');
 const quarter=((rotation%4)+4)%4,oriented=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight)),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
 oriented.width=quarter%2?h:w;oriented.height=quarter%2?w:h;
 const ctx=oriented.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,oriented.width,oriented.height);ctx.translate(oriented.width/2,oriented.height/2);ctx.rotate(quarter*Math.PI/2);ctx.drawImage(image,-w/2,-h/2,w,h);
 const side=Math.min(oriented.width,oriented.height),left=(oriented.width-side)*x/100,top=(oriented.height-side)*y/100,canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(1200,side);canvas.getContext('2d').drawImage(oriented,left,top,side,side,0,0,canvas.width,canvas.height);
 const photo=jpeg(canvas,400000),thumb=document.createElement('canvas');thumb.width=thumb.height=Math.min(320,canvas.width);thumb.getContext('2d').drawImage(canvas,0,0,thumb.width,thumb.height);
 return {photo,thumbnail:jpeg(thumb,60000)};
}
