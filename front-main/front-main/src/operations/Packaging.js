import React, { useState } from 'react';
import { api, fmt, moneyFmt } from './api';
import { Field, Table, Empty } from './Fields';
import './packaging.css';

const emptyBox = { name: '', capacityKg: '', unitCost: '' };
const emptyFilm = { name: 'Плёнка', unitCost: '' };
const emptyPack = { productId: '', boxMaterialId: '', filmQtyM: '', salePrice: '', laborPerBox: '', overheadPerBox: '' };

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
        <section className="op-card"><div className="op-section-heading"><div><span className="op-eyebrow">УПАКОВКА</span><h2>Упаковка и фасовки</h2></div></div>
            <nav className="op-report-tabs op-order-tabs" aria-label="Упаковка">{[['boxes', 'Пустые коробки'], ['films', 'Плёнка'], ['packs', 'Фасовки товаров']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
        </section>
        {tab === 'boxes' && <>
            <section className="op-card"><h2>Пустые коробки на складе</h2><p className="op-muted">Пустая упаковка для производства. Остаток — в штуках.</p>
                {boxes.length ? <Table mobileCards headers={['Коробка', 'Вместимость', 'Цена, ₸/шт', 'Остаток, шт', '']}>{boxes.map(box => <tr key={box.id}><td>{box.name}</td><td>{box.capacityKg ? fmt(box.capacityKg) + ' кг' : '—'}</td><td><input aria-label={'Цена коробки ' + box.name} type="number" min="0" step="0.01" defaultValue={box.unitCost} onBlur={e => Number(e.target.value) !== Number(box.unitCost) && saveMaterial(box.id, { unitCost: e.target.value })} /> ₸</td><td>{fmt(box.quantity)} шт</td><td><button className="ghost danger" disabled={busy || Number(box.quantity) > 0} onClick={() => run(() => api('/materials/' + box.id, { active: false }, 'PATCH'), 'Коробка в архиве')}>Удалить</button></td></tr>)}</Table> : <Empty>Коробок пока нет. Добавьте 2,5 / 1,5 / 1,1 / 2 кг.</Empty>}
            </section>
            <section className="op-card"><h2>Добавить коробку</h2><form onSubmit={addBox}><div className="op-form-grid"><Field label="Название" value={boxForm.name} onChange={e => setBoxForm(f => ({ ...f, name: e.target.value }))} placeholder="Коробка 2,5 кг" /><Field label="Вместимость, кг" type="number" min="0.01" step="0.01" required value={boxForm.capacityKg} onChange={e => setBoxForm(f => ({ ...f, capacityKg: e.target.value }))} /><Field label="Цена за штуку, ₸" type="number" min="0" step="0.01" value={boxForm.unitCost} onChange={e => setBoxForm(f => ({ ...f, unitCost: e.target.value }))} /></div><button disabled={busy}>Добавить коробку</button></form></section>
        </>}
        {tab === 'films' && <>
            <section className="op-card"><h2>Склад плёнки</h2><p className="op-muted">Учёт в метрах. Расход на коробку задаётся в карточке товара.</p>
                {films.length ? <Table mobileCards headers={['Плёнка', 'Цена, ₸/м', 'Остаток, м']}>{films.map(item => <tr key={item.id}><td>{item.name}</td><td><input aria-label={'Цена плёнки ' + item.name} type="number" min="0" step="0.01" defaultValue={item.unitCost} onBlur={e => Number(e.target.value) !== Number(item.unitCost) && saveMaterial(item.id, { unitCost: e.target.value })} /> ₸</td><td>{fmt(item.quantity)} м</td></tr>)}</Table> : <Empty>Плёнки пока нет.</Empty>}
            </section>
            <section className="op-card"><h2>Добавить плёнку</h2><form onSubmit={addFilm}><div className="op-form-grid"><Field label="Название" required value={filmForm.name} onChange={e => setFilmForm(f => ({ ...f, name: e.target.value }))} /><Field label="Цена за метр, ₸" type="number" min="0" step="0.01" value={filmForm.unitCost} onChange={e => setFilmForm(f => ({ ...f, unitCost: e.target.value }))} /></div><button disabled={busy}>Добавить плёнку</button></form></section>
        </>}
        {tab === 'packs' && <>
            <section className="op-card"><h2>Фасовки готовых товаров</h2><p className="op-muted">Например: печенье в коробке 2,5 кг. Цена и остаток — за коробку с товаром.</p>
                {packs.length ? <Table mobileCards headers={['Товар', 'Фасовка', 'Плёнка, м', 'Цена продажи, ₸/кор.', 'Себестоимость', 'Готово, кор.', '']}>{packs.map(pack => <tr key={pack.id}><td>{pack.product.name}</td><td>{fmt(pack.capacityKg)} кг</td><td><input aria-label={'Плёнка на коробку ' + pack.product.name} type="number" min="0" step="0.01" defaultValue={pack.filmQtyM} onBlur={e => Number(e.target.value) !== Number(pack.filmQtyM) && savePack(pack.id, { filmQtyM: e.target.value })} /></td><td><input aria-label={'Цена коробки ' + pack.product.name} type="number" min="0" step="0.01" defaultValue={pack.salePrice ?? ''} onBlur={e => savePack(pack.id, { salePrice: e.target.value })} /> ₸</td><td>{moneyFmt(pack.costPerBox)} ₸</td><td>{fmt(pack.availableBoxes)} кор.</td><td><div className="op-actions"><button className="secondary" disabled={busy} onClick={() => setEditingPack({ ...pack })}>Изменить</button><button className="ghost danger" disabled={busy} onClick={() => deletePack(pack)}>Удалить</button></div></td></tr>)}</Table> : <Empty>Фасовок пока нет.</Empty>}
            </section>
            {editingPack && <section className="op-card"><h2>Изменить фасовку · {editingPack.product.name}</h2><p className="op-muted">Вместимость нельзя менять, если на складе уже есть коробки или была выработка. Цену и плёнку можно менять всегда.</p><form onSubmit={e => { e.preventDefault(); saveEditing(); }}><div className="op-form-grid"><Field label="Пустая коробка"><select value={editingPack.boxMaterialId} onChange={e => setEditingPack(f => ({ ...f, boxMaterialId: e.target.value }))}>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></Field><Field label="Вместимость, кг" type="number" min="0.01" step="0.01" required value={editingPack.capacityKg} onChange={e => setEditingPack(f => ({ ...f, capacityKg: e.target.value }))} /><Field label="Плёнка на коробку, м" type="number" min="0" step="0.01" value={editingPack.filmQtyM} onChange={e => setEditingPack(f => ({ ...f, filmQtyM: e.target.value }))} /><Field label="Цена за коробку, ₸" type="number" min="0" step="0.01" value={editingPack.salePrice ?? ''} onChange={e => setEditingPack(f => ({ ...f, salePrice: e.target.value }))} /><Field label="Оплата за коробку, ₸" type="number" min="0" step="0.01" value={editingPack.laborPerBox} onChange={e => setEditingPack(f => ({ ...f, laborPerBox: e.target.value }))} /></div><div className="op-actions"><button disabled={busy}>Сохранить</button><button type="button" className="ghost danger" disabled={busy} onClick={() => deletePack(editingPack)}>Удалить коробку</button><button type="button" className="secondary" onClick={() => setEditingPack(null)}>Отмена</button></div></form></section>}
            <section className="op-card"><h2>Добавить фасовку товара</h2><form onSubmit={addPack}><div className="op-form-grid"><Field label="Товар"><select required value={packForm.productId} onChange={e => setPackForm(f => ({ ...f, productId: e.target.value }))}><option value="">Выберите товар</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field><Field label="Пустая коробка"><select required value={packForm.boxMaterialId} onChange={e => setPackForm(f => ({ ...f, boxMaterialId: e.target.value }))}><option value="">Выберите коробку</option>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></Field><Field label="Плёнка на коробку, м" type="number" min="0" step="0.01" value={packForm.filmQtyM} onChange={e => setPackForm(f => ({ ...f, filmQtyM: e.target.value }))} /><Field label="Цена за коробку, ₸" type="number" min="0" step="0.01" value={packForm.salePrice} onChange={e => setPackForm(f => ({ ...f, salePrice: e.target.value }))} /><Field label="Оплата за коробку, ₸" type="number" min="0" step="0.01" value={packForm.laborPerBox} onChange={e => setPackForm(f => ({ ...f, laborPerBox: e.target.value }))} /></div><button disabled={busy || !boxes.length}>Добавить</button></form>{!boxes.length && <p className="op-missing">Сначала добавьте упаковку во вкладке «Пустые коробки».</p>}</section>
        </>}
    </>;
}
