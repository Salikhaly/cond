import React, { useState, useRef, useEffect } from 'react';
import { api, fmt, moneyFmt, today } from './api';
import { Field, Select, Badge, Empty, Table } from './Fields';
import useDraft, { DraftNote } from './useDraft';
import WageRequests from './WageRequests';
import ProductionPlan from './ProductionPlan';
import {businessPlan} from './businessPlan';

const packLabel = pack => `${fmt(pack.capacityKg)} кг`;
const boxWord = value => {
    const n = Math.abs(Number(value) || 0) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return 'коробок';
    if (n1 === 1) return 'коробка';
    if (n1 >= 2 && n1 <= 4) return 'коробки';
    return 'коробок';
};

export default function Production({ data, user, run, busy, initialAction, onNavigate }) {
    const admin = user.role === 'super_admin';
    const [tasksOpen,setTasksOpen]=useState(false);
    const [adding, setAdding] = useState(!admin || initialAction === 'add' || ['add', 'record-production', 'day-production'].includes(initialAction?.kind));
    const [status, setStatus] = useState(admin ? 'draft' : 'all');
    const previewRef = useRef(null);
    const [cancelId, setCancelId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [dateFilter,setDateFilter]=useState('');
    const [form, setForm, stored] = useDraft('production-boxes', { productId: '', packId: '', boxes: '', workerId: admin ? '' : user.id, date: today(), reason: '' });
    const [draftTarget, setDraftTarget] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [intentError, setIntentError] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewFor, setPreviewFor] = useState(null);
    const selectedProduct = data.products.find(p => Number(p.id) === Number(form.productId));
    const packs = selectedProduct?.packs || [];
    const selectedPack = packs.find(p => String(p.id) === String(form.packId)) || packs[0];
    const late = !admin && form.date < today();

    const change = (key, value) => setForm(f => {
        const next = { ...f, [key]: value };
        if (key === 'productId') {
            const product = data.products.find(p => Number(p.id) === Number(value));
            next.packId = product?.packs?.[0]?.id || '';
            next.boxes = '';
        }
        if (key === 'packId') next.boxes = '';
        return next;
    });

    useEffect(() => { if (preview) previewRef.current?.scrollIntoView({ block: 'start' }); }, [preview]);
    useEffect(() => {
        if(initialAction?.kind==='day-overview'){setDateFilter(initialAction.date);setStatus('all');setAdding(false);setTasksOpen(false);setDocumentId('');}
        else setDateFilter('');
        if(initialAction?.kind==='production-tasks'){setTasksOpen(true);setAdding(false);}
        if (initialAction?.kind === 'historical-production') { setStatus('posted'); setAdding(false); setDocumentId(''); }
        if (initialAction === 'add' || initialAction?.kind === 'add') { setAdding(true); setDocumentId(''); setPreview(null); setPreviewFor(null); }
        if (initialAction?.kind === 'day-production') {
            setAdding(true);
            if (form.boxes) setDraftTarget({ ...initialAction, productId: form.productId });
            else setForm(f => ({ ...f, date: initialAction.date, workerId: admin ? initialAction.workerId : user.id }));
        }
        if (initialAction?.kind === 'production-document') { setDocumentId(initialAction.id); setStatus('all'); setAdding(false); }
        if (initialAction?.kind === 'record-production') {
            setAdding(true); setStatus('draft');
            if (form.boxes && (Number(form.productId) !== Number(initialAction.productId)||(initialAction.packId&&String(form.packId)!==String(initialAction.packId)))) setDraftTarget(initialAction);
            else if (!form.boxes) {
                const product = data.products.find(p => Number(p.id) === Number(initialAction.productId));
                setForm(f => ({ ...f, productId: String(initialAction.productId), packId: product?.packs?.find(p=>String(p.id)===String(initialAction.packId))?.id || product?.packs?.[0]?.id || '', boxes: '', date: today() }));
            }
        }
        if (initialAction?.kind !== 'check-production') return;
        const p = data.productions.find(p => p.id === initialAction.id); if (!p) return;
        let current = true; setPreviewLoading(true); setIntentError(''); setStatus('draft');
        api('/preview', { productId: p.productId, packId: p.packId, boxes: p.boxes, workerId: p.workerId, date: p.date }).then(calc => { if (current) { setPreview(calc); setPreviewFor(p); } }).catch(e => { if (current) setIntentError(e.message); }).finally(() => { if (current) setPreviewLoading(false); });
        return () => { current = false; };
    }, [initialAction]);

    const rows = data.productions.filter(p => (!dateFilter||p.date===dateFilter) && (!documentId || p.id === documentId) && (status === 'all' || p.status === status));
    const productName = id => [...data.products, ...(data.archivedProducts || [])].find(p => p.id === id)?.name || `Товар №${id}`;
    const workerName = id => data.workers.find(w => w.id === id)?.name || user.name;
    const packOf = p => p.packId ? [...data.products, ...(data.archivedProducts || [])].flatMap(x => x.packs || []).find(x => String(x.id) === String(p.packId)) : null;
    const recordTitle = p => p.boxes ? `${fmt(p.boxes)} ${boxWord(p.boxes)}${p.packId ? ' · ' + (packOf(p)?.capacityKg || '') + ' кг' : ''}` : `${fmt(p.kg)} кг`;
    const validate = () => {
        if (!form.productId) return 'Выберите товар';
        if (!form.packId) return 'Выберите тип коробки';
        if (!(Number(form.boxes) > 0)) return 'Укажите количество коробок';
        return '';
    };

    const submit = () => {
        const error = validate();
        if (error) { setIntentError(error); return; }
        const payload = { productId: Number(form.productId), packId: form.packId, boxes: Number(form.boxes), workerId: admin ? Number(form.workerId) : user.id, date: form.date };
        run(async () => {
            await api(late ? '/wage-requests' : '/productions', late ? { type: 'late_production', date: form.date, reason: form.reason, payload } : payload);
            setForm(f => ({ ...f, boxes: '' }));
            if (admin) setAdding(false);
        }, late ? 'Запрос за прошлую дату отправлен администратору' : 'Выработка записана и ожидает проведения');
    };

    const check = async p => {
        try {
            setPreviewLoading(true); setIntentError('');
            const calc = await api('/preview', { productId: p.productId, packId: p.packId, boxes: p.boxes || undefined, kg: p.packId ? undefined : p.kg, workerId: p.workerId, date: p.date });
            setPreview(calc); setPreviewFor(p);
        } catch (e) { setIntentError(e.message); } finally { setPreviewLoading(false); }
    };

    if(admin&&tasksOpen)return <><button className="ghost" onClick={()=>setTasksOpen(false)}>← К выпускам</button><ProductionPlan plan={businessPlan(data,today())} setTab={onNavigate}/>{!businessPlan(data,today()).rows.length&&<Empty>Нет заявок на производство.</Empty>}</>;
    return <>
        {initialAction?.returnDay&&<button className="ghost" onClick={()=>onNavigate?.('payroll',{kind:'work-day',...initialAction.returnDay})}>← К дню сотрудника</button>}
        {!admin&&data.canViewProductionOrders&&<section className="op-card"><button type="button" className="secondary" aria-expanded={tasksOpen} onClick={()=>setTasksOpen(v=>!v)}>Что готовить · {(data.productionTasks||[]).filter(t=>t.toMake>0).length}</button>{tasksOpen&&<><h2>План по заявкам</h2>{!(data.productionTasks||[]).length&&<Empty>Нет заявок на производство</Empty>}{(data.productionTasks||[]).map(task=>{const product=data.products.find(p=>p.id===task.productId),pack=product?.packs?.find(p=>p.id===task.packId);return <article className="op-review-panel" key={task.key}><h3>{product?.name||'Товар'}{pack?' · '+fmt(pack.capacityKg)+' кг':''}</h3><p>{task.pendingOrders>0?'Есть заявки на согласовании · ':'Согласовано · '}К {task.deliveryDate} · Нужно {fmt(task.packId?task.boxes:task.kg)} {task.unit} · На складе {fmt(task.inStock)}</p><strong>{task.toMake>0?'Осталось изготовить '+fmt(task.toMake)+' '+task.unit:'Есть на складе'}</strong>{task.packId&&task.toMake>0&&<button type="button" disabled={busy} onClick={()=>{if(form.boxes&&(Number(form.productId)!==task.productId||form.packId!==task.packId)){setDraftTarget({...task,date:today()});return;}setForm(f=>({...f,productId:String(task.productId),packId:task.packId,boxes:'',date:today()}));setAdding(true);setTasksOpen(false);}}>Записать выпуск</button>}</article>;})}<p className="op-muted">Задания общие для цеха. Записывайте только свой фактический выпуск. Склад изменится после проверки администратором.</p></>}</section>}
        {dateFilter&&<div className="op-plan-context">Акты за {dateFilter}<button className="ghost" onClick={()=>setDateFilter('')}>Все даты</button></div>}
        {documentId && <div className="op-plan-context">Акт выпуска · № {documentId.slice(0, 8).toUpperCase()}<button className="ghost" onClick={() => setDocumentId('')}>Показать все акты</button></div>}
        {previewLoading && <p className="op-plan-context" role="status">Проверяем расход и остатки…</p>}
        {intentError && <p className="op-missing" role="alert">{intentError}</p>}
        {draftTarget && <div className="op-missing">Есть незаписанный выпуск другого товара. Сохраните его или откройте выбранный товар.<div className="op-actions"><button className="secondary" onClick={() => setDraftTarget(null)}>Продолжить черновик</button><button onClick={() => { setForm(f => ({ ...f, productId: String(draftTarget.productId || ''), packId: draftTarget.packId || '', boxes: '', date: draftTarget.date || today(), workerId: draftTarget.workerId || f.workerId })); setDraftTarget(null); }}>Открыть выбранный товар</button></div></div>}
        {admin && <section className="op-card"><div className="op-section-heading"><h2>Производство</h2><button className="secondary" onClick={()=>setTasksOpen(true)}>План по заявкам</button><button onClick={() => setAdding(v => !v)}>{adding ? 'Закрыть форму' : '+ Записать выпуск'}</button></div><nav className="op-report-tabs op-order-tabs" aria-label="Производство">{[['draft', 'На проверке'], ['posted', 'Подтверждено'], ['all', 'Все записи']].map(([id, label]) => <button key={id} className={status === id ? 'active' : ''} aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>)}</nav></section>}
        {adding && <section className="op-card">
            <h2>{admin ? 'Внести выработку сотрудника' : 'Сколько коробок вы изготовили?'}</h2>
            <p className="op-muted">Выберите товар, тип коробки и количество. Килограммы программа посчитает сама.</p>
            <form onSubmit={e => { e.preventDefault(); submit(); }}>
                <div className="op-form-grid">
                    <Select label="Товар" value={form.productId} onChange={v => change('productId', v)} items={data.products} />
                    {admin && <Select label="Работник" value={form.workerId} onChange={v => change('workerId', v)} items={data.workers} />}
                    <div className="op-field">
                        <label>Тип коробки</label>
                        <select value={form.packId} onChange={e => change('packId', e.target.value)} disabled={!packs.length} required>
                            {!packs.length && <option value="">Сначала добавьте тип коробки</option>}
                            {packs.map(p => <option key={p.id} value={p.id}>{packLabel(p)}{admin && p.salePrice != null ? ` · ${moneyFmt(p.salePrice)} ₸/коробка` : ''}</option>)}
                        </select>
                    </div>
                    <Field label="Количество коробок" type="number" min="1" step="1" required value={form.boxes} onChange={e => change('boxes', e.target.value)} />
                    <Field label="Дата" type="date" max={today()} required value={form.date} onChange={e => change('date', e.target.value)} />
                </div>
                {selectedPack && Number(form.boxes) > 0 && <p className="op-plan-context">{fmt(form.boxes)} {boxWord(form.boxes)} × {fmt(selectedPack.capacityKg)} кг = <b>{fmt(Number(form.boxes) * Number(selectedPack.capacityKg))} кг</b> сырья к списанию. На склад: <b>{fmt(form.boxes)} {boxWord(form.boxes)}</b>.</p>}
                {late && <><p className="op-plan-context">Прошлую дату подтвердит администратор.</p><Field label="Причина" required maxLength={2000} value={form.reason || ''} onChange={e => change('reason', e.target.value)} /></>}
                {!admin && selectedPack && <p className="op-muted">{['piece','monthly_piece'].includes(selectedProduct?.wageMode) ? 'Оплата за коробку: ' + moneyFmt(selectedPack.payPerBox || 0) + ' ₸' : 'Оплата по вашим условиям — в разделе «Моя зарплата»'}</p>}
                <button disabled={busy}>{late ? 'Отправить запрос' : 'Записать'}</button>
            </form>
        </section>}
        {preview && <section ref={previewRef} className="op-card op-preview"><div className="op-section-heading"><h2>{previewFor?.status === 'posted' ? 'Сохранённая калькуляция' : 'Калькуляция перед проведением'}</h2><button className="ghost" aria-label="Закрыть калькуляцию" onClick={() => { setPreview(null); setPreviewFor(null); }}>×</button></div>
            <p>{preview.productName} · {preview.boxes ? <><b>{fmt(preview.boxes)} {boxWord(preview.boxes)}</b> × {fmt(preview.capacityKg)} кг</> : <>{fmt(preview.kg)} кг</>} · версия рецептуры {preview.recipeVersion}</p>
            <Table mobileCards headers={['Материал', 'Списание', 'Цена', 'Стоимость', 'Проверка']}>
                {[...(preview.lines || []), ...(preview.packagingLines || [])].map(l => <tr key={l.materialId}><td>{l.name}</td><td>{fmt(l.quantity)} {l.unit}</td><td>{moneyFmt(l.unitCost)} ₸</td><td>{moneyFmt(l.cost)} ₸</td><td>{previewFor?.status === 'posted' ? 'Списано' : l.enough ? 'Хватает' : `Не хватает ${fmt(Math.max(0, Number(l.quantity) - Number(l.balance)))} ${l.unit}`}</td></tr>)}
            </Table>
            <div className="op-costs"><span>Сырьё <b>{moneyFmt(preview.materialCost)} ₸</b></span><span>Коробки и плёнка <b>{moneyFmt(preview.packagingCost || 0)} ₸</b></span><span>Работнику <b>{moneyFmt(preview.laborCost)} ₸</b></span><span>Прочее <b>{moneyFmt(preview.overheadCost)} ₸</b></span><strong>Всего <b>{moneyFmt(preview.totalCost)} ₸</b></strong>{preview.costPerBox != null && <strong>Себестоимость коробки <b>{moneyFmt(preview.costPerBox)} ₸</b></strong>}</div>
            {previewFor?.status === 'draft' && <><p className="op-muted">Спишет сырьё, коробки и плёнку, начислит зарплату и добавит коробки на склад.</p><button disabled={busy || !preview.enough} onClick={() => run(async () => { await api(`/productions/${previewFor.id}/post`, { expectedCalculation: preview }); setPreview(null); setPreviewFor(null); }, 'Выпуск проведён: коробки на складе, зарплата начислена')}>Подтвердить</button></>}
        </section>}
        <WageRequests data={data} user={user} run={run} busy={busy} type="late_production" onNavigate={onNavigate} />
        <section className="op-card"><h2>{admin ? 'Журнал производства' : 'Моя выработка'}</h2>
            {!rows.length ? <Empty>{status === 'draft' ? 'Нет выпусков на проверке.' : status === 'posted' ? 'Проведённых выпусков пока нет.' : 'Выработки пока нет.'}{!adding && <button className="secondary" onClick={() => setAdding(true)}>+ Записать выпуск</button>}</Empty> : <div className="op-records">{rows.map(p => <article className="op-record" key={p.id}>
                <div>{p._posting ? <span className="op-badge">Проведение ждёт отправки</span> : p._pending ? <span className="op-badge">На телефоне · ждёт отправки</span> : <Badge status={p.status} />}<h3>{productName(p.productId)}</h3><p className="op-muted">{p.date} · {workerName(p.workerId)}</p></div>
                <div className="op-record-value"><strong>{recordTitle(p)}</strong>{p.status === 'posted' && <span>{Number(p.laborCost) > 0 ? 'Начислено ' + moneyFmt(p.laborCost) + ' ₸' : 'Оплата — в заработке за день'}</span>}</div>
                <div className="op-actions">
                    {admin && p.status === 'draft' && !p._posting && <button disabled={busy} onClick={() => check(p)}>Проверить выпуск</button>}
                    {p.status === 'posted' && admin && <button className="secondary" onClick={() => { setPreview(p.snapshot); setPreviewFor(p); }}>Калькуляция</button>}
                    {p.status === 'draft' && !p._posting && <button className="ghost danger" disabled={busy} onClick={() => setCancelId(p.id)}>Отменить запись</button>}
                </div>
                {cancelId === p.id && <div className="op-order-confirm"><b>Отменить {productName(p.productId)} · {recordTitle(p)}?</b><p>Склад и зарплата не изменятся.</p><div className="op-actions"><button disabled={busy} onClick={() => run(async () => { await api(`/productions/${p.id}/cancel`, {}); setCancelId(''); }, 'Выработка отменена')}>Подтвердить отмену</button><button className="secondary" disabled={busy} onClick={() => setCancelId('')}>Оставить запись</button></div></div>}
            </article>)}</div>}
        </section>
    </>;
}
