import React, { useState, useRef, useEffect } from 'react';
import { Field, Empty } from './Fields';
import { fmt, moneyFmt } from './api';
import { DraftNote } from './useDraft';
const money = n => moneyFmt(n) + ' ₸';
const methods = [['refund', 'Деньги'], ['debt', 'Уменьшить долг'], ['credit', 'Следующая поставка']];
export default function ReturnRequest({
  data,
  form,
  setForm,
  exchange,
  setExchange,
  busy,
  onClose,
  onSend,
  stored
}) {
  const [step, setStep] = useState(form.orderId ? 1 : 0),
    [query, setQuery] = useState(''),
    [limit, setLimit] = useState(6),
    [error, setError] = useState('');
  const top = useRef(null),
    reason = useRef(null);
  const change = (key, value) => setForm(f => ({
    ...f,
    [key]: value
  }));
  const source = data.orders.find(o => o.id === form.orderId),
    posted = (data.returns || []).filter(r => r.status === 'posted');
  const returned = (orderId, productId) => posted.filter(r => r.orderId === orderId).flatMap(r => r.lines).filter(l => l.productId === productId);
  const remaining = (o, l) => Math.max(0, Math.round((Number(l.kg) - returned(o.id, l.productId).reduce((s, x) => s + Number(x.kg), 0)) * 10000) / 10000);
  const shipments = data.orders.filter(o => o.status === 'shipped' && !o._pending && o.lines.some(l => remaining(o, l) > 0)).filter(o => [o.id, o.company, o.destination?.outletName, o.destination?.customerName, ...o.lines.map(l => l.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const lines = source ? source.lines.filter(l => Number(form.quantities[l.productId]) > 0).map(l => {
    const previous = returned(source.id, l.productId),
      kg = Number(form.quantities[l.productId]),
      beforeKg = previous.reduce((s, r) => s + Number(r.kg), 0),
      beforeAmount = previous.reduce((s, r) => s + Number(r.amount), 0);
    return {
      ...l,
      kg,
      amount: Math.round((Math.round((beforeKg + kg) * Number(l.price) * 100) / 100 - beforeAmount) * 100) / 100
    };
  }) : [];
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const go = n => {
    setError('');
    setStep(n);
    top.current?.scrollIntoView({
      block: 'start'
    });
  };
  const previousOrder = useRef(form.orderId);
  useEffect(() => {
    if (form.orderId !== previousOrder.current) {
      previousOrder.current = form.orderId;
      if (form.orderId) go(1);
    }
  }, [form.orderId]);
  const setQty = (l, v) => change('quantities', {
    ...form.quantities,
    [l.productId]: v
  });
  const validate = () => {
    if (!source || !lines.length) {
      setError('Укажите, сколько товара возвращают.');
      return false;
    }
    for (const l of source.lines) {
      const raw = form.quantities[l.productId] || 0,
        q = Number(raw);
      if (!Number.isFinite(q) || q < 0 || q > remaining(source, l) + .00001 || Math.abs(q - Math.round(q * 10000) / 10000) > 1e-8) {
        setError('Проверьте количество: ' + l.name);
        return false;
      }
    }
    if (exchange && (!form.replacements.length || form.replacements.some(l => !l.productId || !(Number(l.kg) > 0)))) {
      setError('Выберите товар и количество для замены.');
      return false;
    }
    return true;
  };
  useEffect(() => {
    if (exchange && !form.replacements.length) change('replacements', [{
      productId: '',
      kg: ''
    }]);
  }, [exchange]);
  const toggleExchange = v => {
    setExchange(v);
    if (v && !form.replacements.length) change('replacements', [{
      productId: '',
      kg: ''
    }]);
  };
  return <section ref={top} className="op-card op-request"><div className="op-section-heading"><h2>{exchange ? 'Обмен товара' : 'Возврат товара'}</h2><button className="ghost" aria-label="Закрыть форму возврата" onClick={onClose}>Закрыть</button></div>
 <div className="op-request-steps" aria-label="Шаги возврата">{['Накладная', 'Товар', 'Отправка'].map((label, i) => <button key={label} type="button" className={step === i ? 'active' : step > i ? 'done' : ''} disabled={i > step} aria-current={step === i ? 'step' : undefined} onClick={() => go(i)}><b>{step > i ? '✓' : i + 1}</b><span>{label}</span></button>)}</div>
 <form onSubmit={e => {
      e.preventDefault();
      if (step === 1) {
        if (validate()) go(2);
      } else if (step === 2 && validate()) onSend();
    }}>
 {step === 0 && <><h3>По какой накладной возвращают?</h3><Field label="Найти магазин или накладную" type="search" autoComplete="off" placeholder="Магазин, товар или номер" value={query} onChange={e => {
          setQuery(e.target.value);
          setLimit(6);
        }} />
 <div className="op-invoice-picker">{shipments.slice(0, limit).map(o => <button key={o.id} type="button" className="op-invoice-option" onClick={() => {
            setForm(f => ({
              ...f,
              orderId: o.id,
              quantities: {},
              contactName: o.destination?.contact || f.contactName
            }));
            go(1);
          }}><span><b>{o.destination?.outletName || o.company}</b><small>№ {o.id.slice(0, 8).toUpperCase()} · {new Date(o.shippedAt).toLocaleDateString('ru-RU')}</small><small>{o.lines.map(l => l.name).join(', ')}</small></span><span><b>{money(o.total)}</b><small>Выбрать →</small></span></button>)}</div>{shipments.length > limit && <button className="ghost" type="button" onClick={() => setLimit(n => n + 6)}>Ещё накладные</button>}{!shipments.length && <Empty>{query ? 'Ничего не найдено.' : 'Сначала подтвердите отгрузку в «Заявках».'}</Empty>}</>}
 {step === 1 && source && <><div className="op-request-source"><div><b>{source.destination?.outletName || source.company}</b><small>Накладная № {source.id.slice(0, 8).toUpperCase()}</small></div><button className="ghost" type="button" onClick={() => go(0)}>Изменить</button></div>
 <div className="op-choice-row" role="group" aria-label="Вид запроса"><button type="button" className={!exchange ? 'selected' : ''} aria-pressed={!exchange} onClick={() => toggleExchange(false)}>Возврат</button><button type="button" className={exchange ? 'selected' : ''} aria-pressed={exchange} onClick={() => toggleExchange(true)}>Обмен</button></div>
 <h3>Сколько возвращают?</h3>{source.lines.filter(l => remaining(source, l) > 0).map(l => <article className="op-request-product" key={l.productId}><div><b>{l.name}</b><small>Можно вернуть {fmt(remaining(source, l))} кг · {money(l.price)} / кг</small></div><div className="op-return-qty"><button className="secondary" type="button" aria-label={'Уменьшить возврат: ' + l.name} onClick={() => setQty(l, String(Math.max(0, Number(form.quantities[l.productId] || 0) - 1)))}>−</button><Field label="Кг" aria-label={'Возвращают ' + l.name + ', кг'} type="number" min="0" max={remaining(source, l)} step="0.0001" inputMode="decimal" placeholder="0" value={form.quantities[l.productId] || ''} onChange={e => setQty(l, e.target.value)} /><button className="secondary" type="button" aria-label={'Увеличить возврат: ' + l.name} onClick={() => setQty(l, String(Math.min(remaining(source, l), Number(form.quantities[l.productId] || 0) + 1)))}>+</button><button className="ghost" type="button" onClick={() => setQty(l, String(remaining(source, l)))}>Всё</button></div></article>)}
 {exchange && <div className="op-request-replacements"><h3>Что выдать взамен?</h3>{form.replacements.map((l, i) => <div className="op-return-replacement" key={i}><Field label="Товар для замены"><select required value={l.productId} onChange={e => change('replacements', form.replacements.map((x, j) => i === j ? {
                ...x,
                productId: e.target.value
              } : x))}><option value="">Выберите товар</option>{data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Выдать, кг" required type="number" min="0.0001" step="0.0001" inputMode="decimal" value={l.kg} onChange={e => change('replacements', form.replacements.map((x, j) => i === j ? {
              ...x,
              kg: e.target.value
            } : x))} /><button type="button" className="ghost danger" onClick={() => change('replacements', form.replacements.filter((_, j) => i !== j))}>Убрать товар</button></div>)}<button type="button" className="secondary" onClick={() => change('replacements', [...form.replacements, {
            productId: '',
            kg: ''
          }])}>+ Ещё товар</button><p className="op-muted">Цену замены согласует администратор.</p></div>}
 <div className="op-request-total"><span>Сумма возврата</span><b>{money(total)}</b></div></>}
 {step === 2 && source && <><h3>Проверьте и отправьте</h3><div className="op-request-review"><b>{source.destination?.outletName || source.company}</b>{lines.map(l => <div key={l.productId}><span>{l.name} · {fmt(l.kg)} кг</span><b>{money(l.amount)}</b></div>)}<div className="op-request-review-total"><span>Возврат</span><b>{money(total)}</b></div>{exchange && <p>Взамен: {form.replacements.map(l => (data.products.find(p => String(p.id) === String(l.productId))?.name || 'Товар') + ' · ' + fmt(l.kg) + ' кг').join('; ')}</p>}</div>
 <Field label="Кто возвращает" required maxLength={250} autoComplete="name" value={form.contactName} onChange={e => change('contactName', e.target.value)} /><p className="op-request-label">Причина возврата</p><div className="op-reason-chips">{['Повреждена упаковка', 'Качество товара', 'Срок годности', 'Ошибка заказа'].map(label => <button key={label} type="button" aria-pressed={form.reason === label} className={form.reason === label ? 'selected' : ''} onClick={() => change('reason', label)}>{label}</button>)}</div><Field label="Комментарий"><textarea ref={reason} required maxLength={2000} placeholder="Выберите причину или напишите свою" value={form.reason} onChange={e => change('reason', e.target.value)} /></Field><p className="op-request-label">Как рассчитаться с клиентом?</p><div className="op-choice-row op-settlement-choices" role="group" aria-label="Пожелание клиента по расчёту">{methods.map(([id, label]) => <button key={id} type="button" aria-pressed={form.preferredSettlement === id} className={form.preferredSettlement === id ? 'selected' : ''} onClick={() => change('preferredSettlement', id)}>{label}</button>)}</div><p className="op-muted">Подтвердит администратор.</p></>}
 {error && <p className="op-missing" role="alert">{error}</p>}<DraftNote stored={stored} />{step > 0 && <div className="op-request-footer"><button type="button" className="secondary" disabled={busy} onClick={() => go(step - 1)}>Назад</button><button disabled={busy || step === 1 && !lines.length}>{busy ? 'Сохраняем…' : step === 1 ? 'Далее →' : 'Отправить запрос'}</button></div>}
 </form></section>;
}
