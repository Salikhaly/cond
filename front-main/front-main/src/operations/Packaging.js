import NumericInput from './SafeNumericInput';
import React, { useState, useEffect } from 'react';
import { api, fmt, moneyFmt } from './api';
import { Field, Table, Empty } from './Fields';
import './packaging.css';

function InlineNumber({value,onBlur,...props}){
    const [draft,setDraft]=useState(String(value??''));
    useEffect(()=>setDraft(String(value??'')),[value]);
    return <NumericInput {...props} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={e=>{if(e.target.checkValidity())onBlur?.(e);}}/>;
}

const emptyBox = { name: '', capacityKg: '', unitCost: '' };
const emptyFilm = { name: 'Плёнка', unitCost: '' };
const emptyPack = { productId: '', boxMaterialId: '', filmMaterialId:'', filmQtyM: '', salePrice: '', laborPerBox: '', overheadPerBox: '' };

export default function Packaging({ data, run, busy }) {
    const [tab, setTab] = useState('boxes');
    const [boxForm, setBoxForm] = useState(emptyBox);
    const [filmForm, setFilmForm] = useState(emptyFilm);
    const [packForm, setPackForm] = useState(emptyPack);
    const [editingPack, setEditingPack] = useState(null);
    const materials = data.materials || [];
    const boxes = materials.filter(m => m.kind === 'box');
    const films = materials.filter(m => m.kind === 'film');
    const products = (data.products || []).filter(p => p.is_active !== false);
    const packs = products.flatMap(product => (product.packs || []).map(pack => ({ ...pack, product })));

    const addBox = e => {
        e.preventDefault();
        run(async () => {
            await api('/materials', { name: boxForm.name || 'Коробка ' + boxForm.capacityKg + ' кг', unit: 'шт', kind: 'box', capacityKg: boxForm.capacityKg, unitCost: boxForm.unitCost });
            setBoxForm(emptyBox);
        }, 'Коробка добавлена');
    };
    const addFilm = e => {
        e.preventDefault();
        run(async () => {
            await api('/materials', { name: filmForm.name, unit: 'м', kind: 'film', unitCost: filmForm.unitCost });
            setFilmForm(emptyFilm);
        }, 'Плёнка добавлена');
    };
    const addPack = e => {
        e.preventDefault();
        run(async () => {
            await api('/product-packs', { ...packForm, filmQtyM: packForm.filmQtyM || 0 });
            setPackForm(emptyPack);
        }, 'Тип коробки добавлен товару');
    };
    const saveMaterial = (id, values) => run(() => api('/materials/' + id, values, 'PATCH'), 'Цена обновлена');
    const savePack = (id, values) => run(() => api('/product-packs/' + id, values, 'PATCH'), 'Настройки коробки обновлены');
    const saveEditing = () => run(async () => {
        await api('/product-packs/' + editingPack.id, {
            boxMaterialId: editingPack.boxMaterialId,
            capacityKg: editingPack.capacityKg,
            filmQtyM: editingPack.filmQtyM,
            filmMaterialId: editingPack.filmMaterialId||null,
            salePrice: editingPack.salePrice,
            laborPerBox: editingPack.laborPerBox,
        }, 'PATCH');
        setEditingPack(null);
    }, 'Коробка изменена');
    const deletePack = pack => {
        if (!window.confirm('Удалить коробку ' + fmt(pack.capacityKg) + ' кг у товара «' + pack.product.name + '»?')) return;
        run(async () => {
            const result = await api('/product-packs/' + pack.id, {}, 'DELETE');
            setEditingPack(null);
            if (result.archived) throw new Error('Коробка уже использовалась — она перенесена в архив, а не удалена');
        }, 'Коробка удалена');
    };

    return <>
        <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">УПАКОВКА</span><h2>Коробки и плёнка</h2></div></div>
            <nav className="op-report-tabs op-order-tabs" aria-label="Упаковка">{[['boxes', 'Коробки, шт'], ['films', 'Плёнка, м'], ['packs', 'Коробки товаров']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
        </section>
        {tab === 'boxes' && <>
            <section className="op-card"><h2>Склад коробок</h2><p className="op-muted">Учёт в штуках. Вместимость используется в производстве и калькуляции.</p>
                {boxes.length ? <Table mobileCards headers={['Коробка', 'Вместимость', 'Цена, ₸/шт', 'Остаток, шт', '']}>{boxes.map(box => <tr key={box.id}><td>{box.name}</td><td>{box.capacityKg ? fmt(box.capacityKg) + ' кг' : '—'}</td><td><InlineNumber aria-label={'Цена коробки ' + box.name} type="number" min="0" step="0.01" value={box.unitCost} onBlur={e => Number(e.target.value) !== Number(box.unitCost) && saveMaterial(box.id, { unitCost: e.target.value })} /> ₸</td><td>{fmt(box.quantity)} шт</td><td><button className="ghost danger" disabled={busy || Number(box.quantity) > 0} onClick={() => run(() => api('/materials/' + box.id, { active: false }, 'PATCH'), 'Коробка в архиве')}>Удалить</button></td></tr>)}</Table> : <Empty>Коробок пока нет. Добавьте 2,5 / 1,5 / 1,1 / 2 кг.</Empty>}
            </section>
            <section className="op-card"><h2>Добавить коробку</h2><form onSubmit={addBox}><div className="op-form-grid"><Field label="Название" value={boxForm.name} onChange={e => setBoxForm(f => ({ ...f, name: e.target.value }))} placeholder="Коробка 2,5 кг" /><Field label="Вместимость, кг" type="number" min="0.01" step="0.01" required value={boxForm.capacityKg} onChange={e => setBoxForm(f => ({ ...f, capacityKg: e.target.value }))} /><Field label="Цена за штуку, ₸" type="number" min="0" step="0.01" value={boxForm.unitCost} onChange={e => setBoxForm(f => ({ ...f, unitCost: e.target.value }))} /></div><button disabled={busy}>Добавить коробку</button></form></section>
        </>}
        {tab === 'films' && <>
            <section className="op-card"><h2>Склад плёнки</h2><p className="op-muted">Учёт в метрах. Расход на коробку задаётся в карточке товара.</p>
                {films.length ? <Table mobileCards headers={['Плёнка', 'Цена, ₸/м', 'Остаток, м']}>{films.map(item => <tr key={item.id}><td>{item.name}</td><td><InlineNumber aria-label={'Цена плёнки ' + item.name} type="number" min="0" step="0.01" value={item.unitCost} onBlur={e => Number(e.target.value) !== Number(item.unitCost) && saveMaterial(item.id, { unitCost: e.target.value })} /> ₸</td><td>{fmt(item.quantity)} м</td></tr>)}</Table> : <Empty>Плёнки пока нет.</Empty>}
            </section>
            <section className="op-card"><h2>Добавить плёнку</h2><form onSubmit={addFilm}><div className="op-form-grid"><Field label="Название" required value={filmForm.name} onChange={e => setFilmForm(f => ({ ...f, name: e.target.value }))} /><Field label="Цена за метр, ₸" type="number" min="0" step="0.01" value={filmForm.unitCost} onChange={e => setFilmForm(f => ({ ...f, unitCost: e.target.value }))} /></div><button disabled={busy}>Добавить плёнку</button></form></section>
        </>}
        {tab === 'packs' && <>
            <section className="op-card"><h2>Типы коробок товаров</h2><p className="op-muted">Расход плёнки — в метрах на коробку. Цена берётся из приходов плёнки.</p>
                {packs.length ? <Table mobileCards headers={['Товар', 'Коробка', 'Плёнка, м', 'Цена, ₸/коробка', 'Себестоимость', 'Остаток', '']}>{packs.map(pack => <tr key={pack.id}><td>{pack.product.name}</td><td>{fmt(pack.capacityKg)} кг</td><td>{(films.length>1||pack.filmSelectionRequired)&&<select aria-label={'Плёнка со склада: '+pack.product.name+' · '+pack.capacityKg+' кг'} value={pack.filmMaterialId||''} disabled={busy} onChange={e=>savePack(pack.id,{filmMaterialId:e.target.value||null})}><option value="">Выберите плёнку</option>{films.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>}<InlineNumber disabled={busy||films.length>1&&!pack.filmMaterialId} aria-label={'Плёнка на коробку ' + pack.product.name} type="number" min="0" step="0.01" value={pack.filmQtyM} onBlur={e => Number(e.target.value) !== Number(pack.filmQtyM) && savePack(pack.id, { filmQtyM: e.target.value })} /></td><td><InlineNumber aria-label={'Цена коробки ' + pack.product.name} type="number" min="0" step="0.01" value={pack.salePrice ?? ''} onBlur={e => savePack(pack.id, { salePrice: e.target.value })} /> ₸</td><td>{pack.costPerBox==null?'Выберите плёнку':moneyFmt(pack.costPerBox)+' ₸'}</td><td>{fmt(pack.availableBoxes)} шт</td><td><div className="op-actions"><button className="secondary" disabled={busy} onClick={() => setEditingPack({ ...pack })}>Изменить</button><button className="ghost danger" disabled={busy} onClick={() => deletePack(pack)}>Удалить</button></div></td></tr>)}</Table> : <Empty>Типов коробок пока нет.</Empty>}
            </section>
            {editingPack && <section className="op-card"><h2>Редактировать коробку · {editingPack.product.name}</h2><p className="op-muted">Вместимость нельзя менять, если на складе уже есть коробки или была выработка. Цену и плёнку можно менять всегда.</p><form onSubmit={e => { e.preventDefault(); saveEditing(); }}><div className="op-form-grid"><Field label="Коробка"><select value={editingPack.boxMaterialId} onChange={e => setEditingPack(f => ({ ...f, boxMaterialId: e.target.value }))}>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></Field><Field label="Вместимость, кг" type="number" min="0.01" step="0.01" required value={editingPack.capacityKg} onChange={e => setEditingPack(f => ({ ...f, capacityKg: e.target.value }))} /><Field label="Плёнка со склада"><select value={editingPack.filmMaterialId||(films.length===1?films[0].id:'')} onChange={e=>setEditingPack(f=>({...f,filmMaterialId:e.target.value}))}><option value="">Выберите плёнку</option>{films.map(f=><option key={f.id} value={f.id}>{f.name} · {fmt(f.quantity)} м</option>)}</select></Field><Field label="Плёнка на коробку, м" type="number" min="0" step="0.01" value={editingPack.filmQtyM} onChange={e => setEditingPack(f => ({ ...f, filmQtyM: e.target.value }))} /><Field label="Цена за коробку, ₸" type="number" min="0" step="0.01" value={editingPack.salePrice ?? ''} onChange={e => setEditingPack(f => ({ ...f, salePrice: e.target.value }))} /><Field label="Оплата за коробку, ₸" type="number" min="0" step="0.01" value={editingPack.laborPerBox} onChange={e => setEditingPack(f => ({ ...f, laborPerBox: e.target.value }))} /></div><div className="op-actions"><button disabled={busy}>Сохранить</button><button type="button" className="ghost danger" disabled={busy} onClick={() => deletePack(editingPack)}>Удалить коробку</button><button type="button" className="secondary" onClick={() => setEditingPack(null)}>Отмена</button></div></form></section>}
            <section className="op-card"><h2>Добавить тип коробки товару</h2><form onSubmit={addPack}><div className="op-form-grid"><Field label="Товар"><select required value={packForm.productId} onChange={e => setPackForm(f => ({ ...f, productId: e.target.value }))}><option value="">Выберите товар</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field><Field label="Коробка"><select required value={packForm.boxMaterialId} onChange={e => setPackForm(f => ({ ...f, boxMaterialId: e.target.value }))}><option value="">Выберите коробку</option>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></Field><Field label="Плёнка со склада"><select value={packForm.filmMaterialId||(films.length===1?films[0].id:'')} onChange={e=>setPackForm(f=>({...f,filmMaterialId:e.target.value}))}><option value="">Выберите плёнку</option>{films.map(f=><option key={f.id} value={f.id}>{f.name} · {fmt(f.quantity)} м</option>)}</select></Field><Field label="Плёнка на коробку, м" type="number" min="0" step="0.01" value={packForm.filmQtyM} onChange={e => setPackForm(f => ({ ...f, filmQtyM: e.target.value }))} /><Field label="Цена за коробку, ₸" type="number" min="0" step="0.01" value={packForm.salePrice} onChange={e => setPackForm(f => ({ ...f, salePrice: e.target.value }))} /><Field label="Оплата за коробку, ₸" type="number" min="0" step="0.01" value={packForm.laborPerBox} onChange={e => setPackForm(f => ({ ...f, laborPerBox: e.target.value }))} /></div><button disabled={busy || !boxes.length}>Добавить</button></form>{!boxes.length && <p className="op-missing">Сначала добавьте коробку во вкладке «Коробки».</p>}</section>
        </>}
    </>;
}
