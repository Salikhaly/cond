import BackToReport from './BackToReport';
import AccountPicker from './AccountPicker';
import React, { useState, useEffect } from 'react';
import { api, fmt, moneyFmt } from './api';
import { Field, Empty, Table } from './Fields';
import useDraft from './useDraft';
import ReturnRequest from './ReturnRequest';
const names = {
  requested: 'Ждёт подтверждения',
  posted: 'Товар принят',
  rejected: 'Отклонён',
  cancelled: 'Отменён'
};
const methods = {
  refund: 'Вернуть деньги',
  debt: 'Уменьшить долг',
  credit: 'Зачесть следующую поставку'
};
const kinds = {
  sale: 'Вернуть в продажу',
  inspection: 'Сначала проверить',
  scrap: 'Списать'
};
const actions = {
  requested: 'Создан запрос',
  posted: 'Подтверждён приём товара',
  exchange_posted: 'Проведён обмен',
  inspection_resolved: 'Завершена проверка товара',
  settled: 'Подтверждён расчёт',
  credit_applied: 'Зачёт применён к накладной',
  cancelled: 'Запрос отменён',
  rejected: 'Запрос отклонён'
};
const sum = (a, key) => a.reduce((s, r) => s + Number(r[key] || 0), 0);
const creditLeft = r => (r.settlements || []).filter(s => s.kind === 'credit').reduce((n, s) => n + Math.max(0, Number(s.amount) - sum(s.uses || [], 'amount')), 0);
const money = n => moneyFmt(n) + ' ₸';
const stamp = d => d ? new Date(d).toLocaleString('ru-RU') : '';
const scope = o => o.destination ? o.destination.customerId ? 'customer:' + o.destination.customerId : '' : 'legacy:' + o.company;
function operationId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
}
function held(r, line) {
  return Math.max(0, Number(line.kg) - sum((r.dispositions || []).filter(d => d.productId === line.productId), 'kg'));
}
function ReturnCard({
  r,
  data,
  user,
  run,
  busy,
  online,
  onSaved,
  onPrint
}) {
  const admin = user.role === 'super_admin',canCash=admin&&data.permissions?.cash!==false,
    settled = sum(r.settlements || [], 'amount'),
    left = Math.max(0, Math.round((Number(r.total) - settled) * 100) / 100);
  const [mode, setMode] = useState(''),
    [decisions, setDecisions] = useState(Object.fromEntries(r.lines.map(l => [l.productId, 'inspection']))),
    [received, setReceived] = useState(false),
    [prices, setPrices] = useState((r.replacements || []).map(() => ''));
  const [reason, setReason] = useState(''),
    [productId, setProductId] = useState(''),
    [quantity, setQuantity] = useState(''),
    [kind, setKind] = useState(''),
    [settlement, setSettlement] = useState(r.preferredSettlement),
    [value, setValue] = useState(''),
    [reference, setReference] = useState(''),
    [paymentAccount,setPaymentAccount]=useState({method:'cash'}),
    [confirmed, setConfirmed] = useState(false),
    [credit, setCredit] = useState(null),
    [orderId, setOrderId] = useState('');
  const [review, setReview] = useDraft('return-confirm:' + r.id, null);
  const reset = () => {
    setMode('');
    setReason('');
    setReference('');
    setConfirmed(false);
    setValue('');
    // A refresh can unmount this card before the draft effect runs.
    try { localStorage.removeItem('cond.draft.v1:' + localStorage.getItem('cond-owner') + ':return-confirm:' + r.id); } catch {}
    setReview(null);
  };
  useEffect(() => {
    if (review && ((review.path.endsWith('/post') && r.status === 'posted') ||
      (review.path.endsWith('/cancel') && ['cancelled', 'rejected'].includes(r.status)))) reset();
  }, [r.status]);
  const reviewAction = (path, body, text) => setReview({
    path,
    body,
    text,
    operationId: operationId()
  });
  const apply = (path, body, text) => reviewAction(path, body, text);
  const available = credit ? Math.max(0, Number(credit.amount) - sum(credit.uses || [], 'amount')) : 0;
  const eligible = data.orders.filter(o => o.status === 'shipped' && !o._pending && (o.id === r.exchangeOrderId || new Date(o.shippedAt) >= new Date(r.postedAt)) && (r.customer?.scope === 'outlet' ? o.destination?.outletId === r.customer.destination?.outletId : scope(o) === r.customer?.scopeKey));
  const heldLines = r.lines.filter(l => held(r, l) > .00001);
  return <article className={'op-card op-return-card ' + r.status}><div className="op-section-heading"><div><span className={'op-badge ' + (r.status === 'posted' ? 'posted' : 'draft')}>{r._pending ? 'На телефоне · ждёт отправки' : names[r.status]}</span><h3>{r.customer?.destination?.outletName || r.customer?.company || 'Возврат'}</h3><p className="op-muted">{r.replacements?.length ? 'Обмен' : 'Возврат'} № {r.id.slice(0, 8).toUpperCase()} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}</p></div><b className="op-return-amount">{money(r.total)}</b></div>
 <div className="op-return-items">{r.lines.map(l => <div key={l.productId}><span>{l.name}</span><b>{fmt(l.kg)} кг</b></div>)}</div>
 <p className="op-return-short-reason">{r.reason}</p>
 <details className="op-return-document"><summary>Накладная и подробности</summary><p className="op-muted">Накладная № {r.orderId.slice(0, 8).toUpperCase()} · {stamp(r.createdAt)}</p> <p className="op-return-reason"><b>{r.contactName}</b> · {r.reason}</p><Table mobileCards headers={['Товар', 'Возвращают', 'Цена за кг', 'Сумма']}>{r.lines.map(l => <tr key={l.productId}><td>{l.name}</td><td>{fmt(l.kg)} кг</td><td>{money(l.price)}</td><td>{money(l.amount)}</td></tr>)}</Table>
 {!!r.replacements?.length && <div className="op-plan-context"><b>Взамен выдать:</b>{r.replacements.map(l => <p key={l.productId}>{l.name} · {fmt(l.kg)} кг</p>)}{r.exchangeOrderId && <p>Отгружено по новой накладной № {r.exchangeOrderId.slice(0, 8).toUpperCase()}. Расчёт оформляется ниже отдельно.</p>}</div>}
 <p className="op-muted">Запрос: {r.createdByName || 'Вы'} · пожелание клиента: {methods[r.preferredSettlement]}. {r.postedByName && 'Принял: ' + r.postedByName + ' · ' + stamp(r.postedAt)}</p>
</details>
 {r.status === 'posted' && <>{left > .001 && <div className="op-return-money-next"><span>Осталось рассчитаться</span><b>{money(left)}</b></div>}{creditLeft(r) > .001 && <div className="op-return-credit-next"><span>Доступно для следующей поставки</span><b>{money(creditLeft(r))}</b></div>}{heldLines.length > 0 && <div className="op-plan-waiting"><b>На проверке · отдельно от продажи</b>{heldLines.map(l => <p key={l.productId}>{l.name} · {fmt(held(r, l))} кг</p>)}</div>}{(r.dispositions || []).length > 0 && <p className="op-muted">{r.dispositions.map(d => (d.kind === 'sale' ? 'В продажу' : 'Списано') + ': ' + fmt(d.kg) + ' кг · ' + r.lines.find(l => l.productId === d.productId)?.name).join('; ')}</p>}
 {!!r.settlements?.length && <details className="op-return-document"><summary>Расчёты · {r.settlements.length}</summary><p>Подтверждено {money(settled)} из {money(r.total)}</p>{(r.settlements || []).map(s => <div className="op-return-settlement" key={s.id}><div><b>{methods[s.kind]} · {money(s.amount)}</b><small>{stamp(s.createdAt)} · {s.actorName}{admin && s.reference ? ' · ' + s.reference : ''}</small>{s.kind === 'credit' && <small>Использовано {money(sum(s.uses || [], 'amount'))} · доступно {money(Number(s.amount) - sum(s.uses || [], 'amount'))}</small>}{(s.uses || []).map(c => <small key={c.id}>Накладная № {c.orderId.slice(0, 8).toUpperCase()} · {money(c.amount)}</small>)}</div>{canCash && s.kind === 'credit' && Number(s.amount) - sum(s.uses || [], 'amount') > .001 && <button className="secondary" disabled={busy || !online} onClick={() => {
            setMode('credit');
            setCredit(s);
            setOrderId(r.exchangeOrderId || '');
            setValue('');
            setReference('');
            setConfirmed(false);
          }}>Применить зачёт</button>}</div>)}</details>}
 {(r.settlements || []).some(s => s.kind === 'debt') && <p className="op-muted">Уменьшение долга учтено в разделе «Клиенты → Оплаты и долги».</p>}</>}
 {!mode && !review && <div className="op-actions">{admin && r.status === 'requested' && !r._pending && <button disabled={busy || !online} onClick={() => setMode('post')}>{r.replacements?.length ? 'Проверить обмен' : 'Принять возврат'}</button>}{r.status === 'requested' && !r._pending && (admin || r.createdBy === user.id) && <button className="ghost danger" disabled={busy || !online} onClick={() => setMode('cancel')}>{admin ? 'Отклонить' : 'Отменить запрос'}</button>}{canCash && r.status === 'posted' && creditLeft(r) > .001 && <button className="secondary" disabled={busy || !online} onClick={() => {
        const s = r.settlements.find(s => s.kind === 'credit' && Number(s.amount) - sum(s.uses || [], 'amount') > .001);
        setCredit(s);
        setMode('credit');
        setValue('');
        setReference('');
        setConfirmed(false);
        setOrderId(r.exchangeOrderId || '');
      }}>Зачесть в поставку</button>}{admin && r.status === 'posted' && heldLines.length > 0 && <button className="secondary" disabled={busy || !online} onClick={() => {
        setMode('resolve');
        setProductId(String(heldLines[0].productId));
        setQuantity('');
        setKind('');
      }}>Завершить проверку</button>}{canCash && r.status === 'posted' && left > .001 && <button disabled={busy || !online} onClick={() => {
        setMode('settle');
        setValue(String(left));
        setReference('');
        setConfirmed(false);
      }}>Оформить расчёт</button>}{r.status === 'posted' && <button className="secondary" onClick={() => onPrint(r)}>Акт / Печать</button>}</div>}
 {mode && !review && <section className="op-return-editor"><div className="op-section-heading"><h3>{{
            post: r.replacements?.length ? 'Товар получен, замена готова?' : 'Как принять товар?',
            cancel: 'Причина отмены',
            resolve: 'Решение после проверки',
            settle: 'Расчёт с клиентом',
            credit: 'Зачёт в следующую поставку'
          }[mode]}</h3><button className="ghost" onClick={reset}>Закрыть</button></div>
 {mode === 'post' && <form onSubmit={e => {
        e.preventDefault();
        apply('/returns/' + r.id + '/post', {
          received,
          decisions: r.lines.map(l => ({
            productId: l.productId,
            kind: decisions[l.productId]
          })),
          prices
        }, r.replacements?.length ? 'Принять возврат и списать товары, выданные взамен? Новая накладная будет создана автоматически.' : 'Подтвердить приём возврата? Только товар с решением «В продажу» увеличит свободный остаток.');
      }}>{r.lines.map(l => <div className="op-decision-product" key={l.productId}><b>{l.name} · {fmt(l.kg)} кг</b><div className="op-decision-choices" role="group" aria-label={l.name + ' — решение'}>{Object.entries(kinds).map(([key, label]) => <button type="button" key={key} className={decisions[l.productId] === key ? 'selected ' + key : key} aria-pressed={decisions[l.productId] === key} onClick={() => setDecisions(d => ({
              ...d,
              [l.productId]: key
            }))}><b>{label}</b><small>{key === 'sale' ? 'Можно отгружать' : key === 'inspection' ? 'Отдельно от продажи' : 'Брак, без возврата на склад'}</small></button>)}</div></div>)}{r.replacements?.length > 0 && <><h3>Цена замены — согласовывает администратор</h3>{r.replacements.map((l, i) => <Field key={l.productId} label={l.name + ' · ' + fmt(l.kg) + ' кг · цена за кг, ₸'} required type="number" min="0" step="0.01" inputMode="decimal" value={prices[i]} onChange={e => setPrices(p => p.map((v, j) => i === j ? e.target.value : v))} />)}<p>Новая накладная: <b>{money(r.replacements.reduce((s, l, i) => s + l.kg * Number(prices[i] || 0), 0))}</b></p></>}<label className="op-check"><input type="checkbox" required checked={received} onChange={e => setReceived(e.target.checked)} />Товар фактически получен{r.replacements?.length ? ' и замена передаётся клиенту' : ''}</label><p className="op-muted">Деньги и зачёт оформляются отдельно.</p><button disabled={busy || !online}>Проверить</button></form>}
 {mode === 'cancel' && <form onSubmit={e => {
        e.preventDefault();
        apply('/returns/' + r.id + '/cancel', {
          reason
        }, 'Отклонить / отменить запрос? История сохранится, склад не изменится.');
      }}><Field label="Почему?" required value={reason} onChange={e => setReason(e.target.value)} /><button className="secondary" disabled={busy || !online}>Продолжить</button></form>}
 {mode === 'resolve' && <form onSubmit={e => {
        e.preventDefault();
        apply('/returns/' + r.id + '/resolve', {
          productId: Number(productId),
          kg: quantity,
          kind,
          reason
        }, (kind === 'sale' ? 'Вернуть в продажу ' : 'Списать ') + fmt(quantity) + ' кг?');
      }}><Field label="Товар на проверке"><select value={productId} onChange={e => {
            setProductId(e.target.value);
            setQuantity('');
          }}>{heldLines.map(l => <option key={l.productId} value={l.productId}>{l.name} · осталось {fmt(held(r, l))} кг</option>)}</select></Field><Field label="Количество, кг" required type="number" inputMode="decimal" min="0.0001" max={held(r, r.lines.find(l => l.productId === Number(productId)) || {
          productId: 0,
          kg: 0
        })} step="0.0001" value={quantity} onChange={e => setQuantity(e.target.value)} /><Field label="Решение"><select required value={kind} onChange={e => setKind(e.target.value)}><option value="">Выберите</option><option value="sale">В продажу</option><option value="scrap">Списать</option></select></Field><Field label="Что показала проверка?" required value={reason} onChange={e => setReason(e.target.value)} /><button disabled={busy || !online}>Проверить решение →</button></form>}
 {(mode === 'settle' || mode === 'credit') && <form onSubmit={e => {
        e.preventDefault();
        if (mode === 'settle') apply('/returns/' + r.id + '/settle', {
          kind: settlement,
          amount: value,
          reference,
          ...(settlement==='refund'?paymentAccount:{}),
          confirmed
        }, methods[settlement] + ': ' + money(value) + '?' + (settlement === 'refund' ? ' Сумма будет записана в расходы.' : ''));else apply('/return-credits/' + credit.id + '/apply', {
          orderId,
          amount: value,
          reference,
          confirmed
        }, 'Применить ' + money(value) + ' к накладной № ' + orderId.slice(0, 8).toUpperCase() + '? Деньги повторно не выдаются.');
      }}>
 {mode === 'settle' ? <div><p className="op-request-label">Что сделали с суммой возврата?</p><div className="op-choice-row op-settlement-choices" role="group" aria-label="Способ расчёта">{Object.entries(methods).map(([key, label]) => <button type="button" key={key} className={settlement === key ? 'selected' : ''} aria-pressed={settlement === key} onClick={() => {
              setSettlement(key);
              setConfirmed(false);
            }}>{label}</button>)}</div></div> : <><p>Доступно {money(available)}. Только накладные этого клиента после возврата.</p><Field label="Следующая отгруженная накладная"><select required value={orderId} onChange={e => setOrderId(e.target.value)}><option value="">Выберите накладную</option>{eligible.map(o => <option key={o.id} value={o.id}>№ {o.id.slice(0, 8).toUpperCase()} · {o.destination?.outletName || o.company} · {money(o.total)}</option>)}</select></Field>{!eligible.length && <p className="op-plan-waiting">Сначала подтвердите следующую отгрузку этого клиента в разделе «Заявки».</p>}</>}
 {mode === 'settle' && settlement === 'debt' && <p className="op-plan-context">Запишем подтверждённое уменьшение долга. Общий баланс покупателя пока не рассчитан.</p>}<Field label="Сумма, ₸" required type="number" min="0.01" max={mode === 'settle' ? left : available} step="0.01" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} />{mode==='settle'&&settlement==='refund'&&<AccountPicker data={data} value={paymentAccount.accountId} method={paymentAccount.method} onChange={(accountId,method)=>setPaymentAccount({accountId,method})}/>}<Field label={mode === 'settle' && settlement === 'refund' ? 'Подтверждение выдачи / перевода' : 'Основание расчёта'} required value={reference} onChange={e => setReference(e.target.value)} /><label className="op-check"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{mode === 'settle' && settlement === 'refund' ? 'Деньги действительно переданы клиенту' : 'Расчёт проверен и подтверждён мной'}</label><button disabled={busy || !online}>Проверить расчёт →</button></form>}
 </section>}
 {review && <div className="op-order-confirm" role="region" aria-label="Подтверждение операции возврата"><b>{review.text}</b><p>{r.customer?.destination?.outletName || r.customer?.company} · исходный возврат {money(r.total)}</p>{review.body.decisions && <p>{review.body.decisions.map(d => (r.lines.find(l => l.productId === d.productId)?.name || 'Товар') + ' · ' + fmt(r.lines.find(l => l.productId === d.productId)?.kg) + ' кг · ' + kinds[d.kind]).join('; ')}</p>}<p className="op-muted">При потере связи подтверждение сохранится на устройстве. Повторное нажатие не создаст вторую операцию.</p><div className="op-actions"><button disabled={busy || !online} onClick={() => run(async () => {
          await api(review.path, review.body, 'POST', review.operationId);
          reset();
          if (review.path.endsWith('/post')) onSaved?.();
        }, 'Операция возврата сохранена')}>Подтвердить</button><button className="secondary" disabled={busy} onClick={() => setReview(null)}>Назад</button></div></div>}
 {!!r.events?.length && <details className="op-help"><summary>История · {r.events.length}</summary>{r.events.map(e => <div className="op-return-event" key={e.id}><b>{actions[e.action] || e.action}</b><small>{stamp(e.createdAt)} · {e.actorName}</small>{e.after?.kg && <p>{r.lines.find(l => l.productId === e.after.productId)?.name} · {fmt(e.after.kg)} кг · {kinds[e.after.kind]}</p>}{e.after?.amount && <p>{methods[e.after.kind] || 'Применён зачёт'} · {money(e.after.amount)}{e.after.orderId ? ' · накладная № ' + e.after.orderId.slice(0, 8).toUpperCase() : ''}</p>}{e.after?.decisions && <p>{e.after.decisions.map(d => (r.lines.find(l => l.productId === d.productId)?.name || 'Товар') + ': ' + kinds[d.kind]).join('; ')}</p>}{e.reason && <p>{e.reason}</p>}</div>)}</details>}
 </article>;
}
export default function Returns({
  data,
  user,
  run,
  busy,
  initialAction,
  onNavigate
}) {
  const admin = user.role === 'super_admin',canCash=admin&&data.permissions?.cash!==false,
    online = !data._offline && navigator.onLine && !data.sync?.readOnly;
  const initial = {
    exchange: false,
    orderId: '',
    contactName: '',
    reason: '',
    preferredSettlement: 'credit',
    quantities: {},
    replacements: []
  };
  const [form, setForm, stored] = useDraft('goods-return', initial);
  const [focusId,setFocusId]=useState(initialAction?.kind==='return-document'?initialAction.id:null);
  const [adding, setAdding] = useState(initialAction?.kind === 'return'),
    [exchange, setExchangeState] = useState(Boolean(form.exchange)),
    [filter, setFilter] = useState(admin ? 'requested' : 'all'),
    [search, setSearch] = useState(''),
    [customer, setCustomer] = useState(''),
    [print, setPrint] = useState(null),
    [target, setTarget] = useState(null);
  const setExchange = v => {
    setExchangeState(v);
    setForm(f => ({
      ...f,
      exchange: v
    }));
  };
  useEffect(() => {
    if(initialAction?.kind==='return-document'){setFocusId(initialAction.id);setAdding(false);}
    if (initialAction?.kind === 'return') {
      setAdding(true);
      if (form.orderId && form.orderId !== initialAction.orderId && (form.reason || Object.values(form.quantities).some(v => Number(v) > 0))) setTarget(initialAction.orderId);else if (form.orderId !== initialAction.orderId) {
        setExchangeState(false);
        setForm({ ...initial, orderId: initialAction.orderId });
      }
    }
  }, [initialAction]);
  const change = (key, value) => setForm(f => ({
      ...f,
      [key]: value
    })),
    source = data.orders.find(o => o.id === form.orderId);
  const shipped = data.orders.filter(o => o.status === 'shipped' && !o._pending),
    buyers = [...new Map(shipped.map(o => [o.destination?.outletId || o.company, o.destination?.outletName || o.company])).entries()];
  const returns = data.returns || [],
    posted = returns.filter(r => r.status === 'posted'),
    left = posted.reduce((s, r) => s + Math.max(0, Number(r.total) - sum(r.settlements || [], 'amount')), 0),
    inspection = posted.reduce((s, r) => s + r.lines.reduce((n, l) => n + held(r, l), 0), 0);
  const rows = returns.filter(r => (filter === 'all' || filter === 'inspection' && r.status === 'posted' && r.lines.some(l => held(r, l) > .00001) || filter === 'finance' && r.status === 'posted' && (Number(r.total) - sum(r.settlements || [], 'amount') > .001 || creditLeft(r) > .001) || r.status === filter) && [r.customer?.company, r.customer?.destination?.outletName, r.contactName, r.reason, r.id].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const reasonRows=[...returns.filter(r=>r.status==='posted').reduce((map,r)=>{const key=(r.reason||'Без причины').trim();const row=map.get(key)||{reason:key,count:0,amount:0,kg:0};row.count+=1;row.amount+=Number(r.total||0);row.kg+=(r.lines||[]).reduce((s,l)=>s+Number(l.kg||0),0);map.set(key,row);return map;},new Map()).values()].sort((a,b)=>b.amount-a.amount);
  if (filter === 'posted') rows.sort((a, b) => String(b.postedAt || b.createdAt).localeCompare(String(a.postedAt || a.createdAt)));
  const remain = l => Math.max(0, l.kg - posted.filter(r => r.orderId === source.id).reduce((s, r) => s + r.lines.filter(x => x.productId === l.productId).reduce((a, x) => a + x.kg, 0), 0));
  const focusedReturn=returns.find(r=>r.id===focusId);
  if(focusedReturn&&!print)return <><BackToReport action={initialAction} onNavigate={onNavigate}/><button className="ghost" onClick={()=>setFocusId(null)}>← Все возвраты</button><ReturnCard r={focusedReturn} data={data} user={user} run={run} busy={busy} online={online} onSaved={()=>{}} onPrint={setPrint}/></>;
  if (print) return <section className="op-card op-print-document"><div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={() => setPrint(null)}>Назад</button></div><h2>Акт {print.replacements?.length ? 'обмена' : 'возврата'} № {print.id.slice(0, 8).toUpperCase()}</h2><p>{print.customer?.company} · {print.customer?.destination?.outletName}</p><p>По накладной № {print.orderId.slice(0, 8).toUpperCase()} · принят {stamp(print.postedAt)}</p><p>Клиент: {print.contactName}. Причина: {print.reason}</p><Table headers={['Товар', 'Кг', 'Цена, ₸', 'Сумма, ₸']}>{print.lines.map(l => <tr key={l.productId}><td>{l.name}</td><td>{fmt(l.kg)}</td><td>{money(l.price)}</td><td>{money(l.amount)}</td></tr>)}</Table><p>Итого: {money(print.total)}</p><p>Принял: {print.postedByName}</p><p>Подтверждено расчётов: {money(sum(print.settlements || [], 'amount'))}</p><p>Клиент __________ · Принял __________</p></section>;
  return <><section className="op-card op-module-heading"><div className="op-section-heading"><div><p className="op-muted">Запрос → приём товара → решение и расчёт.</p></div>{!adding && <div className="op-actions"><button onClick={() => {
            setAdding(true);
            if (!form.orderId) setExchange(false);
          }}>{form.orderId ? 'Продолжить черновик' : '+ Возврат'}</button><button className="secondary" onClick={() => {
            setAdding(true);
            setExchange(true);
          }}>Обмен</button></div>}</div><div className="op-return-kpis"><button className={filter === 'requested' ? 'secondary active' : 'secondary'} aria-pressed={filter === 'requested'} onClick={() => setFilter('requested')}>Новые <b>{returns.filter(r => r.status === 'requested').length}</b></button><button className={filter === 'inspection' ? 'secondary active' : 'secondary'} aria-pressed={filter === 'inspection'} onClick={() => setFilter('inspection')}>Проверить товар <b>{fmt(inspection)} кг</b></button><button className={filter === 'finance' ? 'secondary active' : 'secondary'} aria-pressed={filter === 'finance'} onClick={() => setFilter('finance')}>Расчёты <b>{posted.filter(r => Number(r.total) - sum(r.settlements || [], 'amount') > .001 || creditLeft(r) > .001).length}</b></button></div></section>
 {reasonRows.length>0&&<section className="op-card"><h2>Возвраты по причинам</h2><p className="op-muted">Принятые возвраты за всё время. Суммы уменьшают продажи.</p><Table mobileCards headers={['Причина','Возвратов','Кг','Сумма, ₸']}>{reasonRows.map(row=><tr key={row.reason}><td>{row.reason}</td><td>{row.count}</td><td>{fmt(row.kg)}</td><td>{moneyFmt(row.amount)} ₸</td></tr>)}</Table></section>}{target && <div className="op-plan-context"><b>Уже начат возврат по другой накладной.</b><div className="op-actions"><button className="secondary" onClick={() => setTarget(null)}>Продолжить черновик</button><button onClick={() => {
          setForm({
            ...initial,
            orderId: target
          });
          setExchangeState(false);
          setTarget(null);
        }}>Открыть выбранную накладную</button></div></div>}{!online && <p className="op-plan-context">Запрос можно сохранить на телефоне и отправить при связи. Приём, списание и денежный расчёт подтверждаются с подключением к серверу.</p>}
 {adding && <ReturnRequest data={data} form={form} setForm={setForm} exchange={exchange} setExchange={setExchange} busy={busy} stored={stored} onClose={() => setAdding(false)} onSend={() => run(async () => {
      const lines = Object.entries(form.quantities).filter(([, kg]) => Number(kg) > 0).map(([id, kg]) => ({
        productId: Number(id),
        kg: Number(kg)
      }));
      await api('/returns', {
        orderId: form.orderId,
        contactName: form.contactName,
        reason: form.reason,
        preferredSettlement: form.preferredSettlement,
        lines,
        replacements: exchange ? form.replacements.map(l => ({
          productId: Number(l.productId),
          kg: Number(l.kg)
        })) : []
      });
      setForm(initial);
      setAdding(false);
      setFilter('all');
    }, 'Запрос сохранён. Администратор увидит его в возвратах')} />}
 <section className="op-card op-return-toolbar"><div className="op-section-heading"><h3>{{
            requested: 'Новые запросы',
            inspection: 'Проверить товар',
            finance: 'Расчёты с клиентами',
            posted: 'Товар принят',
            all: 'Все возвраты'
          }[filter]}</h3>{filter !== 'all' && <button className="ghost" onClick={() => setFilter('all')}>Все возвраты →</button>}</div><Field label="Найти возврат" type="search" placeholder="Магазин, клиент, причина или номер" value={search} onChange={e => setSearch(e.target.value)} /></section>
 {!rows.length ? <Empty>Здесь пока нет возвратов. Выберите другой фильтр или создайте запрос по накладной.</Empty> : rows.map(r => <ReturnCard key={r.id} r={r} data={data} user={user} run={run} busy={busy} online={online} onSaved={() => setFilter('posted')} onPrint={setPrint} />)}
 <details className="op-help"><summary>Как учитывается возврат</summary><p>Первоначальная продажа не редактируется. Принятый возврат уменьшает продажи на дату приёма. Только годный товар возвращается в продажу. Проверка и списание сохраняются в истории. Начисленная зарплата кондитера не меняется.</p><p>Уменьшение долга и зачёт — отдельные подтверждённые записи. Баланс по введённым отгрузкам и оплатам доступен в разделе «Клиенты». Зачёт можно использовать в следующей отгруженной накладной того же клиента; для раздельных расчётов магазинов — только того же магазина.</p></details></>;
}
