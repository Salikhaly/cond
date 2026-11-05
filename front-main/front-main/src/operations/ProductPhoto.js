import React, { useState,useEffect } from 'react';
import {readCache,writeCache} from './offline';
export function photoSource(p) {
  if (/^data:image\/(jpeg|png|webp);base64,/.test(p.photo || '')) return p.photo;
  if(/^\/products\/[a-z0-9_.-]+\.(png|jpg|webp)$/i.test(p.image||''))return p.image;
  const image = String(p.image || '').replace(/^\/api\//, '/').replace(/^\/?uploads\//, '');
  return /^[a-z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(image) ? '/api/uploads/' + image : '';
}
export default function ProductPhoto({
  product,
  onOpen
}) {
  const [remote,setRemote]=useState(''),[failed,setFailed]=useState('');
  useEffect(()=>{setRemote('');if(!product.photoUrl)return;let active=true,url;const controller=new AbortController(),key=localStorage.getItem('cond-owner')+':product-image:'+product.id+':'+product.photoVersion;
    const show=blob=>{if(active&&blob instanceof Blob){url=URL.createObjectURL(blob);setRemote(url);}};
    fetch(product.photoUrl+'&size=thumb',{headers:{Authorization:'Bearer '+(localStorage.getItem('token')||'')},signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Фото недоступно');const blob=await r.blob();writeCache(key,blob).catch(()=>{});return blob;}).then(show).catch(()=>{if(active)readCache(key).then(show).catch(()=>{});});return()=>{active=false;controller.abort();if(url)URL.revokeObjectURL(url);};},[product.photoUrl]);
  const source=product.photo?photoSource(product):remote||(!product.hasPhoto?photoSource(product):'');
  return <div className="op-photo-wrap">{source && failed !== source ? <img src={source} alt={product.name} loading="lazy" onError={() => setFailed(source)} /> : <div className="op-photo-placeholder"><span aria-hidden="true">◈</span><small>Фото пока не добавлено</small></div>}{onOpen && <button className="op-photo-open" type="button" aria-label={'Открыть ' + product.name} onClick={onOpen}>Посмотреть</button>}</div>;
}
export async function preparePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите фото JPG, PNG или WebP');
  if (file.size > 10 * 1024 * 1024) throw new Error('Выберите фото до 10 МБ');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Не удалось открыть фото'));
      i.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight)),
      canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let result;
    for (const quality of [.86, .72, .55, .35]) {
      result = canvas.toDataURL('image/jpeg', quality);
      if (result.length < 520000) return result;
    }
    throw new Error('Фото слишком подробное. Выберите изображение меньшего размера');
  } finally {
    URL.revokeObjectURL(url);
  }
}
