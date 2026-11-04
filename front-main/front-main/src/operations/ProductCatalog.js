import React, { useState } from 'react';
import { api, fmt, moneyFmt } from './api';
import Packaging from './Packaging';
import Icon from './Icon';
import { Field, Empty } from './Fields';
import ProductPhoto from './ProductPhoto';
import { RecipeEditor } from './Recipes';
import './packaging.css';

function ProductEditor({ product, onBack, onSaved, run }) {
    const [form, setForm] = useState(product ? {
        name: product.name || '',
        weight: product.weight || '',
        priceForEmployee: product.priceForEmployee ?? 0,
        pricePerKg: product.packs?.[0]?.capacityKg && product.packs[0].salePrice != null
            ? Math.round(Number(product.packs[0].salePrice) / Number(product.packs[0].capacityKg) * 100) / 100
            : product.salePrice ?? '',
        filmQtyM: product.packs?.[0]?.filmQtyM ?? '',
        description: product.description || '',
        photo: product.photo || '',
    } : { name: '', weight: '', priceForEmployee: 0, pricePerKg: '', filmQtyM: '', description: '', photo: '' });
    const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
    return <section className="op-card op-simple-editor"><button className="ghost" onClick={onBack}>← К товарам</button><h2>{product ? 'Изменить товар' : 'Новый товар'}</h2>
        <form onSubmit={e => {
            e.preventDefault();
            run(async () => {
                if (product) await api('/products/' + product.id, form, 'PATCH');
                else await api('/products', form);
                onSaved();
            }, product ? 'Товар сохранён' : 'Готовый товар создан');
        }}>
            <Field label="Название" required maxLength={250} value={form.name} onChange={e => change('name', e.target.value)} />
            <Field label="Вместимость коробки, кг" type="number" min="0.01" step="0.01" required value={form.weight} onChange={e => change('weight', e.target.value)} />
            <Field label="Цена за 1 кг, ₸" type="number" min="0" step="0.01" value={form.pricePerKg} onChange={e => change('pricePerKg', e.target.value)} />
            <Field label="Плёнка на 1 коробку, метров" type="number" min="0" step="0.01" value={form.filmQtyM} onChange={e => change('filmQtyM', e.target.value)} />
            <Field label="Оплата работнику за кг, ₸" type="number" min="0" step="0.01" value={form.priceForEmployee} onChange={e => change('priceForEmployee', e.target.value)} />
            <Field label="Описание покупателю"><textarea maxLength={1500} value={form.description} onChange={e => change('description', e.target.value)} /></Field>
            <p className="op-field-hint">Цена за кг — своя у каждого товара. Из неё автоматически считаются цены коробок 2,5 / 2 / 1,1 / 1,5 кг. Изменить можно в «Упаковка → Коробки товаров».</p>
            <button disabled={!form.name || !form.weight}>Сохранить</button>
        </form>
    </section>;
}

export default function ProductCatalog({ data, run, busy, initialAction, onProduce }) {
    const [editing, setEditing] = useState(null);
    const [recipeId, setRecipeId] = useState(initialAction?.kind === 'recipe' ? initialAction.productId : null);
    const [packaging, setPackaging] = useState(false);
    const [search, setSearch] = useState('');
    const [archived, setArchived] = useState(false);
    if (packaging) return <><button className="ghost" onClick={() => setPackaging(false)}>← К товарам</button><Packaging data={data} run={run} busy={busy} /></>;
    const recipeProduct = (data.products || []).find(p => Number(p.id) === Number(recipeId));
    if (recipeProduct) return <RecipeEditor product={recipeProduct} data={data} run={run} busy={busy} onClose={() => setRecipeId(null)} />;
    if (editing !== null) return <ProductEditor product={editing.id ? editing : null} run={run} onBack={() => setEditing(null)} onSaved={() => setEditing(null)} />;
    const rows = (archived ? data.archivedProducts || [] : data.products || []).filter(product => product.name.toLowerCase().includes(search.trim().toLowerCase()));
    return <>
        <section className="op-card op-module-heading"><div className="op-section-heading"><h2>Готовые товары</h2><div className="op-actions"><button className="secondary" onClick={() => setPackaging(true)}><Icon name="box" size={18} />Упаковка</button><button className="secondary" onClick={() => run(() => api('/products/packs/ensure-all', {}, 'POST'), 'Всем товарам добавлены коробки 2,5 / 2 / 1,1 / 1,5 кг')}>4 коробки всем</button><button onClick={() => setEditing({})}>+ Товар</button></div></div><Field label="Найти товар" type="search" value={search} placeholder="Название" onChange={e => setSearch(e.target.value)} /><button className="ghost" onClick={() => setArchived(v => !v)}>{archived ? '← Действующие товары' : 'Архив товаров'}</button></section>
        <div className="op-master-list">{rows.map(product => {
            const packs = product.packs || [];
            return <article className="op-product-list-card suite-product" key={product.id}><div className="op-product-list-title">{!archived && <div className="op-product-thumb"><ProductPhoto product={product} /></div>}<div><h3>{product.name}</h3><p className="op-muted">{packs.length ? packs.map(pack => fmt(pack.capacityKg) + ' кг').join(' · ') : 'Коробка ' + fmt(product.weight) + ' кг'}</p><span className={'suite-stock-pill ' + (Number(product.availableKg) > 0 ? 'available' : 'waiting')}>{Number(product.availableKg) > 0 ? 'Свободно ' + fmt(product.availableKg) + ' кг' : 'Под производство'}</span></div></div>
                {archived ? <button className="secondary" disabled={busy} onClick={() => run(async () => { await api('/products/' + product.id, { active: true }, 'PATCH'); setArchived(false); }, 'Товар восстановлен')}>Восстановить</button> : <>
                    <div className="op-pack-list">{packs.length ? <><div className="op-pack-price-kg">Цена за кг: <b>{packs[0].salePrice != null && Number(packs[0].capacityKg)>0 ? moneyFmt(Number(packs[0].salePrice)/Number(packs[0].capacityKg)) : '—'} ₸</b></div><div className="op-pack-table"><div className="op-pack-table-head"><span>Коробка</span><span>Цена</span><span>Себестоимость</span><span>Остаток</span></div>{packs.map(pack => <div key={pack.id} className="op-pack-table-row"><span>{fmt(pack.capacityKg)} кг<small>плёнка {fmt(pack.filmQtyM)} м</small></span><span>{pack.salePrice == null ? '—' : moneyFmt(pack.salePrice) + ' ₸'}</span><span>{moneyFmt(pack.costPerBox)} ₸</span><span>{fmt(pack.availableBoxes)} шт</span></div>)}</div></> : <p className="op-missing">Добавьте тип коробки в разделе «Упаковка».</p>}</div>
                    <div className="op-product-actions"><button className="secondary" onClick={() => setEditing(product)}>Изменить</button><button className="secondary" onClick={() => run(async () => { await api('/products/' + product.id + '/packs/ensure', {}, 'POST'); }, 'Добавлены коробки 2,5 / 2 / 1,1 / 1,5 кг')}>+ 4 коробки</button><button className="secondary" onClick={() => setPackaging(true)}>+ Коробка</button><button className={packs.length ? 'secondary' : ''} onClick={() => setRecipeId(product.id)}>Состав</button>{onProduce && packs[0] && <button className="secondary" onClick={() => onProduce(product.id)}>Выпуск</button>}</div>
                </>}
            </article>;
        })}</div>{!rows.length && <Empty>{archived ? 'Архив пуст.' : 'Товаров пока нет.'}</Empty>}
    </>;
}
