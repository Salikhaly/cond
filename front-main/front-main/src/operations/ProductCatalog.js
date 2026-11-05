import {boxWord} from './boxWord';
import React, { useEffect, useState, useRef } from 'react';
import { api, fmt, moneyFmt } from './api';
import Packaging from './Packaging';
import Icon from './Icon';
import { Field, Empty } from './Fields';
import ProductPhoto from './ProductPhoto';
import ProductPhotoEditor from './ProductPhotoEditor';
import ProductPresentation from './ProductPresentation';
import { RecipeWorkspace } from './Recipes';
import {productCostSummary} from './productCostSummary';
import './packaging.css';

function ProductEditor({ product, onBack, onSaved, run, busy }) {
    const [form, setForm] = useState(product ? {
        name: product.name || '',
        weight: product.weight || '',
        priceForEmployee: product.priceForEmployee ?? 0,
        pricePerKg: product.packs?.[0]?.capacityKg && product.packs[0].salePrice != null
            ? Math.round(Number(product.packs[0].salePrice) / Number(product.packs[0].capacityKg) * 100) / 100
            : product.salePrice ?? '',
        filmQtyM: product.packs?.[0]?.filmQtyM ?? '',
        description: product.description || '',
    } : { name: '', weight: '', priceForEmployee: 0, pricePerKg: '', filmQtyM: '', description: '' });
    const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
    return <section className="op-card op-simple-editor"><button className="ghost" onClick={onBack}>← К товарам</button><h2>{product ? 'Изменить товар' : 'Новый товар'}</h2>
        <form onSubmit={e => {
            e.preventDefault();
            run(async () => {
                const saved=product?await api('/products/'+product.id,form,'PATCH'):await api('/products',form);
                onSaved(saved);
            }, product ? 'Товар сохранён' : 'Готовый товар создан');
        }}>
            <Field label="Название" required maxLength={250} value={form.name} onChange={e => change('name', e.target.value)} />
            {!product?.packs?.length&&<Field label="Вместимость коробки, кг" type="number" min="0.01" step="0.01" required value={form.weight} onChange={e => change('weight', e.target.value)} />}
            <Field label="Цена за 1 кг, ₸" type="number" min="0" step="0.01" value={form.pricePerKg} onChange={e => change('pricePerKg', e.target.value)} />
            <details className="op-help"><summary>Работа, плёнка и описание</summary><Field label="Плёнка на 1 коробку, метров" type="number" min="0" step="0.01" value={form.filmQtyM} onChange={e => change('filmQtyM', e.target.value)} />
            <Field label="Оплата работнику за кг, ₸" disabled={product?.wageRateLocked} type="number" min="0" step="0.01" value={form.priceForEmployee} onChange={e => change('priceForEmployee', e.target.value)} />
            <Field label="Описание покупателю"><textarea maxLength={1500} value={form.description} onChange={e => change('description', e.target.value)} /></Field>
            <p className="op-field-hint">Цена за кг — своя у каждого товара. Из неё автоматически считаются цены коробок 2,5 / 2 / 1,1 / 1,5 кг. Изменить можно в «Упаковка → Коробки товаров».</p></details>
            <button disabled={busy || !form.name || !form.weight}>Сохранить</button>
        </form>
    </section>;
}

export default function ProductCatalog({ data, run, busy, initialAction, onProduce, onNavigate }) {
    const [editing, setEditing] = useState(null),[focused,setFocused]=useState(initialAction?.kind==='product'?Number(initialAction.productId):null),[photoEditing,setPhotoEditing]=useState(false);
    const [recipeId, setRecipeId] = useState(initialAction?.kind === 'recipe' ? initialAction.productId : null);
    const [packaging, setPackaging] = useState(false);
    const [search, setSearch] = useState('');
    const [archived, setArchived] = useState(false);
    const [limit,setLimit]=useState(12);
    const listScroll=useRef(0);
    const openProduct=id=>{listScroll.current=document.querySelector('.op-main')?.scrollTop||0;setFocused(id);};
    useEffect(()=>{document.querySelector('.op-main')?.scrollTo({top:focused?0:listScroll.current});},[focused]);
    useEffect(()=>setLimit(12),[search,archived]);
    useEffect(()=>{if(initialAction?.kind==='add')setEditing({});if(initialAction?.kind==='product'){setFocused(Number(initialAction.productId));setPhotoEditing(false);setEditing(null);setRecipeId(null);}},[initialAction]);
    if (packaging) return <><button className="ghost" onClick={() => setPackaging(false)}>← К товарам</button><Packaging data={data} run={run} busy={busy} /></>;
    const recipeProduct = (data.products || []).find(p => Number(p.id) === Number(recipeId));
    if (recipeProduct) return <RecipeWorkspace key={recipeProduct.id} product={recipeProduct} data={data} run={run} busy={busy} onClose={() => setRecipeId(null)} onFullCost={data.permissions?.finance!==false&&onNavigate?()=>onNavigate('recipes',{kind:'full-cost'}):null} onMaterial={onNavigate?issue=>issue.kind==='material'&&issue.scope==='packaging'?onNavigate('packaging'):onNavigate('materials',issue.materialId?{kind:'receipt',materialId:issue.materialId}:{kind:'search',query:''}):null}/>;
    if (editing !== null) return <ProductEditor product={editing.id ? editing : null} run={run} busy={busy} onBack={() => setEditing(null)} onSaved={saved=>{setEditing(null);if(saved?.id)setFocused(Number(saved.id));}} />;
    const product=(data.products||[]).find(p=>p.id===focused);
    const packs=product?.packs||[];
    if(product&&photoEditing)return <ProductPhotoEditor key={product.id} product={product} data={data} run={run} busy={busy} onBack={()=>setPhotoEditing(false)}/>;
    if(product)return <section className="op-card ux-product-detail"><button className="ghost" onClick={()=>setFocused(null)}>← Все товары</button><div className="op-section-heading"><h2>{product.name}</h2><button className="secondary" onClick={()=>setEditing(product)}>Изменить</button></div><ProductPhoto product={product}/><div className="op-actions"><button onClick={()=>setPhotoEditing(true)}>{product.hasPhoto||product.photo?'Изменить фото':'Добавить фото'}</button><button className="secondary" onClick={()=>setRecipeId(product.id)}>Состав и себестоимость</button>{onProduce&&<button className="secondary" onClick={()=>onProduce(product.id)}>Записать выпуск</button>}</div>{product.description&&<p>{product.description}</p>}<ProductPresentation key={product.id+':'+product.catalogVisible+':'+product.catalogGroup} product={product} data={data} run={run} busy={busy}/><div className="ux-product-pack-cards">{(product.packs||[]).map(pack=><article key={pack.id}><b>Коробка {fmt(pack.capacityKg)} кг</b><strong>{pack.salePrice==null?'Цена не указана':moneyFmt(pack.salePrice)+' ₸'}</strong><span>Свободно {fmt(pack.availableBoxes)} {boxWord(pack.availableBoxes)} · {fmt(Number(pack.availableBoxes||0)*Number(pack.capacityKg))} кг</span></article>)}</div><details className="op-help ux-pack-details"><summary>Настроить фасовки · {packs.length}</summary><div className="op-pack-list">{packs.length ? <><div className="op-pack-price-kg">Цена за кг: <b>{packs[0].salePrice != null && Number(packs[0].capacityKg)>0 ? moneyFmt(Number(packs[0].salePrice)/Number(packs[0].capacityKg)) : '—'} ₸</b></div><div className="op-pack-table"><div className="op-pack-table-head"><span>Коробка</span><span>Цена</span><span>Себестоимость</span><span>Остаток</span></div>{packs.map(pack => <div key={pack.id} className="op-pack-table-row"><span>{fmt(pack.capacityKg)} кг<small>плёнка {fmt(pack.filmQtyM)} м</small></span><span data-label="Цена">{pack.salePrice == null ? '—' : moneyFmt(pack.salePrice) + ' ₸'}</span><span data-label="Себестоимость">{(()=>{const cost=productCostSummary(product,data,pack.id);return cost.complete?moneyFmt(cost.total)+' ₸':'Нужно уточнить';})()}</span><span data-label="Остаток">{fmt(pack.availableBoxes)} шт</span></div>)}</div></> : <p className="op-missing">Добавьте тип коробки в разделе «Упаковка».</p>}</div><div className="op-actions"><button className="secondary" onClick={() => run(async () => { await api('/products/' + product.id + '/packs/ensure', {}, 'POST'); }, 'Добавлены коробки 2,5 / 2 / 1,1 / 1,5 кг')}>+ 4 коробки</button><button className="secondary" onClick={() => setPackaging(true)}>+ Коробка</button></div></details></section>;
    const rows = (archived ? data.archivedProducts || [] : data.products || []).filter(product => product.name.toLowerCase().includes(search.trim().toLowerCase()));
    return <>
        <section className="op-card op-module-heading"><div className="op-section-heading"><h2>Готовые товары</h2><button onClick={()=>setEditing({})}>+ Товар</button></div><Field label="Найти товар" type="search" value={search} placeholder="Название" onChange={e=>setSearch(e.target.value)}/><details className="op-help ux-catalog-settings"><summary>Архив и упаковка</summary><div className="op-actions"><button className="secondary" onClick={()=>setPackaging(true)}>Упаковка</button><button className="secondary" disabled={busy} onClick={()=>run(()=>api('/products/packs/ensure-all',{},'POST'),'Стандартные коробки добавлены')}>Добавить стандартные коробки всем</button><button className="ghost" onClick={()=>setArchived(v=>!v)}>{archived?'Действующие товары':'Архив товаров'}</button></div></details></section>
        <div className="op-master-list">{rows.slice(0,limit).map(product => {
            const packs = product.packs || [];
            return <article className="op-product-list-card suite-product" key={product.id}><div className="op-product-list-title">{!archived && <div className="op-product-thumb"><ProductPhoto product={product} /></div>}<div><h3><button className="ux-product-name" onClick={()=>openProduct(product.id)}>{product.name}</button></h3><p className="op-muted">{packs.length ? packs.map(pack => fmt(pack.capacityKg) + ' кг').join(' · ') : 'Коробка ' + fmt(product.weight) + ' кг'}</p><span className={'suite-stock-pill ' + (Number(product.availableKg) > 0 ? 'available' : 'waiting')}>{Number(product.availableKg) > 0 ? 'Свободно ' + fmt(product.availableKg) + ' кг' : 'Под производство'}</span></div></div>
                {archived ? <button className="secondary" disabled={busy} onClick={() => run(async () => { await api('/products/' + product.id, { active: true }, 'PATCH'); setArchived(false); }, 'Товар восстановлен')}>Восстановить</button> : <>
                    <div className="ux-product-price"><span>Цена за кг</span><strong>{product.salePrice==null?'Не указана':moneyFmt(product.salePrice)+' ₸'}</strong></div>
                    <button className="secondary op-wide-action" onClick={()=>openProduct(product.id)}>Открыть товар →</button>
                </>}
            </article>;
        })}</div>{rows.length>limit&&<button className="secondary op-wide-action" onClick={()=>setLimit(n=>n+12)}>Показать ещё · {rows.length-limit}</button>}{!rows.length && <Empty>{archived ? 'Архив пуст.' : 'Товаров пока нет.'}</Empty>}
    </>;
}
