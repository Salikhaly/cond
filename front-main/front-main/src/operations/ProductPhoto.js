import React, { useState } from 'react';
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
  const source = photoSource(product),
    [failed, setFailed] = useState('');
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
