import React, { useState,useRef,useEffect } from 'react';
import { api, fmt, moneyFmt, today } from './api';
import { Field, Select, Badge, Empty, Table } from './Fields';
import useDraft, { DraftNote } from './useDraft';
import WageRequests from './WageRequests';
export default function Production({ data, user, run, busy, initialAction, onNavigate }) {
    const admin = user.role === 'super_admin';
    const [adding,setAdding]=useState(!admin || initialAction === 'add' || ['add','record-production','day-production'].includes(initialAction?.kind)),[status,setStatus]=useState(admin?'draft':'all');const previewRef=useRef(null);
    const [cancelId,setCancelId] = useState('');
    const [documentId,setDocumentId]=useState('');
    const [form, setForm, stored] = useDraft('production',{ productId: '', workerId: admin ? '' : user.id, kg: '', date: today() });
    const [draftTarget,setDraftTarget]=useState(null),[previewLoading,setPreviewLoading]=useState(false),[intentError,setIntentError]=useState('');
    const [preview, setPreview] = useState(null);
    const [previewFor, setPreviewFor] = useState(null);
    useEffect(()=>{if(preview)previewRef.current?.scrollIntoView({block:'start'})},[preview]);
    useEffect(()=>{
        if(initialAction?.kind==='historical-production'){setStatus('posted');setAdding(false);setDocumentId('');}
        if(initialAction==='add'||initialAction?.kind==='add'){setAdding(true);setDocumentId('');setPreview(null);setPreviewFor(null);}
        if(initialAction?.kind==='day-production'){setAdding(true);if(form.kg)setDraftTarget({...initialAction,productId:form.productId});else setForm(f=>({...f,date:initialAction.date,workerId:admin?initialAction.workerId:user.id}));}
        if(initialAction?.kind==='production-document'){
            setDocumentId(initialAction.id);setStatus('all');setAdding(false);
        }
        if(initialAction?.kind==='record-production'){
            setAdding(true);setStatus('draft');
            if(form.kg&&Number(form.productId)!==Number(initialAction.productId))setDraftTarget(initialAction);
            else if(!form.kg)setForm(f=>({...f,productId:String(initialAction.productId),kg:'',date:today()}));
        }
        if(initialAction?.kind!=='check-production')return;
        const p=data.productions.find(p=>p.id===initialAction.id);if(!p)return;
        let current=true;setPreviewLoading(true);setIntentError('');setStatus('draft');
        api('/preview',{productId:p.productId,kg:p.kg,workerId:p.workerId,date:p.date}).then(calc=>{if(current){setPreview(calc);setPreviewFor(p);}}).catch(e=>{if(current)setIntentError(e.message);}).finally(()=>{if(current)setPreviewLoading(false);});
        return()=>{current=false;};
    },[initialAction]);
    const rows=data.productions.filter(p=>(!documentId||p.id===documentId)&&(status==='all'||p.status===status));
    const late=!admin&&form.date<today();
    const selectedProduct=data.products.find(p=>Number(p.id)===Number(form.productId));
    const pack=data.products.find(p=>Number(p.id)===Number(form.productId))?.packKg;
    const change = (k, v) => setForm(f => ({ ...f, [k]: v,...(k==='productId'?{kg:'',packages:''}:{}),...(k==='packages'?{kg:String(Math.round(Number(v)*Number(pack)*10000)/10000)}:{}) }));
    const productName = id => [...data.products,...(data.archivedProducts||[])].find(p => p.id === id)?.name || `Товар №${id}`;
    const workerName = id => data.workers.find(w => w.id === id)?.name || user.name;
    return <>{documentId&&<div className="op-plan-context">Акт выпуска · № {documentId.slice(0,8).toUpperCase()}<button className="ghost" onClick={()=>setDocumentId('')}>Показать все акты</button></div>}{previewLoading&&<p className="op-plan-context" role="status">Проверяем расход и остатки…</p>}{intentError&&<p className="op-missing" role="alert">{intentError}</p>}{draftTarget&&<div className="op-missing">Есть незаписанный выпуск другого товара. Сохраните его или откройте выбранный товар.<div className="op-actions"><button className="secondary" onClick={()=>setDraftTarget(null)}>Продолжить черновик</button><button onClick={()=>{setForm(f=>({...f,productId:String(draftTarget.productId||''),kg:'',date:draftTarget.date||today(),workerId:draftTarget.workerId||f.workerId}));setDraftTarget(null);}}>Открыть выбранный товар</button></div></div>}{admin&&<section className="op-card"><div className="op-section-heading"><h2>Производство</h2><button onClick={()=>setAdding(v=>!v)}>{adding?'Закрыть форму':'+ Записать выпуск'}</button></div><nav className="op-report-tabs op-order-tabs" aria-label="Производство">{[['draft','На проверке'],['posted','Подтверждено'],['all','Все записи']].map(([id,label])=><button key={id} className={status===id?'active':''} aria-pressed={status===id} onClick={()=>setStatus(id)}>{label}</button>)}</nav></section>}{adding&&<>
        <section className="op-card"><h2>{admin ? 'Внести выработку сотрудника' : 'Сколько вы изготовили?'}</h2><p className="op-muted">После проверки выпуск поступит на склад.</p>
            <form onSubmit={e => { e.preventDefault(); run(async () => { await api(late?'/wage-requests':'/productions',late?{type:'late_production',date:form.date,reason:form.reason,payload:form}:form); setForm(f => ({ ...f, kg: '',packages:'' }));if(admin)setAdding(false); }, late?'Запрос за прошлую дату отправлен администратору':'Выработка записана и ожидает проведения'); }}>
                {initialAction?.kind==='record-production'&&initialAction.needKg!=null&&Number(form.productId)===Number(initialAction.productId)&&<p className="op-plan-context">По заявкам нужно ещё {fmt(initialAction.needKg)} кг после проверки имеющихся выпусков. Запишите фактически изготовленное количество.</p>}<DraftNote stored={stored}/><div className="op-form-grid"><Select label="Товар" value={form.productId} onChange={v => change('productId', v)} items={data.products} />
                    {admin && <Select label="Работник" value={form.workerId} onChange={v => change('workerId', v)} items={data.workers} />}
                    {pack?<div><Field label="Изготовлено пачек" type="number" min="1" step="1" required value={form.packages||''} onChange={e=>change('packages',e.target.value)}/><p className="op-muted">{fmt(pack)} кг × {fmt(form.packages)} = {fmt(form.kg)} кг</p></div>:<Field label="Изготовлено, кг" type="number" min="0.0001" step="0.0001" required value={form.kg} onChange={e => change('kg', e.target.value)} />}<Field label="Дата производства" type="date" max={today()} required value={form.date} onChange={e => change('date', e.target.value)} />
                </div>
                {late&&<><p className="op-plan-context">Прошлая дата: администратор сначала разрешит запись, затем проверит выпуск.</p><Field label="Почему записываете прошлой датой" required maxLength={2000} value={form.reason||''} onChange={e=>change('reason',e.target.value)}/></>}{!admin&&selectedProduct&&<p className="op-muted">{selectedProduct.wageMode==='piece'?'Ставка на сегодня: '+moneyFmt(pack?selectedProduct.payPerPack:selectedProduct.payRateForKg)+' ₸/'+(pack?'пачку':'кг'):'Оплата по вашим условиям — в разделе «Моя зарплата»'}</p>}<button disabled={busy}>{late?'Отправить запрос за прошлую дату':'Записать выработку'}</button>
            </form>
        </section>
        </>}{preview && <section ref={previewRef} className="op-card op-preview"><div className="op-section-heading"><h2>{previewFor?.status === 'posted' ? 'Сохранённая калькуляция' : 'Калькуляция перед проведением'}</h2><button className="ghost" aria-label="Закрыть калькуляцию" onClick={() => { setPreview(null); setPreviewFor(null); }}>×</button></div>
            {preview.historical&&<p className="op-plan-context">Историческая выработка. Известна оплата труда; расход сырья и полная себестоимость не восстановлены.</p>}<p>{preview.productName} · {fmt(preview.kg)} кг · версия рецептуры {preview.recipeVersion}</p>
            {preview._offline && <p className="op-alert">Предварительный расчёт по данным телефона. Сервер повторно проверит остатки, рецепт и ставку при отправке.</p>}
            <Table mobileCards headers={['Материал', 'Списание', 'Цена', 'Стоимость', 'Проверка']}>
                {preview.lines.map(l => <tr key={l.materialId}><td>{l.name}</td><td>{fmt(l.quantity)} {l.unit}</td><td>{moneyFmt(l.unitCost)} ₸</td><td>{moneyFmt(l.cost)} ₸</td><td>{previewFor?.status === 'posted' ? 'Списано' : l.enough ? 'Хватает' : `Не хватает ${fmt(Math.max(0,Number(l.quantity)-Number(l.balance)))} ${l.unit}`}</td></tr>)}
            </Table>
            <div className="op-costs"><span>Материалы <b>{preview.historical?'Не указан':moneyFmt(preview.materialCost)+' ₸'}</b></span><span>Работнику <b>{moneyFmt(preview.laborCost)} ₸</b></span><span>Прочее <b>{preview.historical?'Не указано':moneyFmt(preview.overheadCost)+' ₸'}</b></span><strong>Всего <b>{preview.historical?'Не рассчитано':moneyFmt(preview.totalCost)+' ₸'}</b></strong><strong>На 1 кг <b>{preview.historical?'Не рассчитано':moneyFmt(preview.costPerKg)+' ₸'}</b></strong></div>
            {previewFor?.status === 'draft' && <><p className="op-muted">Проведение спишет материалы, добавит готовую продукцию и учтёт труд по действующим условиям сотрудника. Операция выполняется целиком.</p><button disabled={busy || !preview.enough} onClick={() => run(async () => { await api(`/productions/${previewFor.id}/post`, {expectedCalculation:preview}); setPreview(null); setPreviewFor(null); }, 'Выпуск проведён: материалы списаны, зарплата начислена')}>{preview._offline ? "Сохранить проведение на телефоне" : "Подтвердить выпуск"}</button></>}
        </section>}
        <WageRequests data={data} user={user} run={run} busy={busy} type="late_production" onNavigate={onNavigate}/><section className="op-card"><h2>{admin ? 'Журнал производства' : 'Моя выработка'}</h2>
            {!rows.length ? <Empty>{status==='draft'?'Нет выпусков на проверке.':status==='posted'?'Проведённых выпусков пока нет.':'Выработки пока нет.'}{!adding&&<button className="secondary" onClick={()=>setAdding(true)}>+ Записать выпуск</button>}</Empty> : <div className="op-records">{rows.map(p => <article className="op-record" key={p.id}>
                <div>{p._posting ? <span className="op-badge">Проведение ждёт отправки</span> : p._pending ? <span className="op-badge">На телефоне · ждёт отправки</span> : <Badge status={p.status} />}<h3>{productName(p.productId)}</h3><p className="op-muted">{p.date} · {workerName(p.workerId)}</p></div>
                <div className="op-record-value"><strong>{fmt(p.kg)} кг</strong>{p.status === 'posted' && <span>{Number(p.laborCost)>0?'Начислено '+moneyFmt(p.laborCost)+' ₸':'Оплата — в заработке за день'}</span>}</div>
                <div className="op-actions">
                    {admin && p.status === 'draft' && !p._posting && <button disabled={busy} onClick={() => run(async () => { const calc = await api('/preview', {productId:p.productId,kg:p.kg,workerId:p.workerId,date:p.date}); setPreview(calc); setPreviewFor(p); }, '')}>Проверить выпуск</button>}
                    {p.status === 'posted' && admin && <button className="secondary" onClick={() => { setPreview(p.snapshot); setPreviewFor(p); }}>Калькуляция</button>}
                    {p.status === 'draft' && !p._posting && <button className="ghost danger" disabled={busy} onClick={()=>setCancelId(p.id)}>Отменить запись</button>}
                </div>{cancelId===p.id&&<div className="op-order-confirm"><b>Отменить {productName(p.productId)} · {fmt(p.kg)} кг?</b><p>Сырьё и зарплата по этой записи ещё не учитывались.</p><div className="op-actions"><button disabled={busy} onClick={()=>run(async()=>{await api(`/productions/${p.id}/cancel`,{});setCancelId('');},'Выработка отменена')}>Подтвердить отмену</button><button className="secondary" disabled={busy} onClick={()=>setCancelId('')}>Оставить запись</button></div></div>}
            </article>)}</div>}
        </section>
    </>;
}

