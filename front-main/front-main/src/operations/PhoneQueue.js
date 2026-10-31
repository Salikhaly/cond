import React, { useEffect, useState } from 'react';
import { queued, saveQueued, removeQueued } from './offline';
import { flushQueue, fmt } from './api';
const label = path => path.includes('/cash')?'Оплата / распределение денег':path.includes('/receipt-drafts')?'Проведение прихода':path.includes('/expenses')?'Расход / исправление':path.includes('/wage-requests')?'Запрос / ответ на согласование':path.includes('/work-days')?'Отметка смены': path.includes('/returns') ? 'Запрос на возврат / обмен' : path.includes('/post') ? 'Проведение выпуска' : path.includes('/productions') ? 'Выработка' : path.includes('/receipts') ? 'Приход' : path.includes('/payments') ? 'Выплата' : path.includes('/orders') ? 'Заявка / отгрузка' : 'Расход';
export default function PhoneQueue({ refresh }) {
    const [rows, setRows] = useState([]), [sending, setSending] = useState(false);
    const update = () => queued().then(setRows).catch(() => {});
    useEffect(() => {
        const tick = async () => { const before = await queued(); await flushQueue(); update(); if (before.length && !(await queued()).length) await refresh(); };
        tick(); const timer = setInterval(tick, 15000); window.addEventListener('online', tick);
        return () => { clearInterval(timer); window.removeEventListener('online', tick); };
    }, []);
    useEffect(() => { const timer = setInterval(update, 1000); return () => clearInterval(timer); }, []);
    if (!rows.length) return null;
    return <section className="op-card"><h2>На телефоне · ждут отправки: {rows.length}</h2><p>Эти записи сохранены на этом устройстве. Остатки и зарплаты изменятся после проверки сервером. Не удаляйте данные приложения до отправки.</p>
        {rows.map(row => <article className="op-record" key={row.id}><div><strong>{label(row.path)}</strong><p>{new Date(row.created).toLocaleString('ru-RU')}{row.body.kg ? ` · ${row.body.kg} кг` : ''}</p>{row.body.amount && <p>{fmt(row.body.amount)} ₸{row.body.salaryMonth ? ` за ${row.body.salaryMonth}` : ''}</p>}{row.error && <p role="alert">Не принято: {row.error}</p>}</div>{row.error && <div className="op-actions"><button className="secondary" onClick={async () => { await saveQueued({ ...row, error: null }); update(); }}>Повторить проверку</button><button className="ghost danger" onClick={async () => { await removeQueued(row.id); update(); }}>Убрать отклонённую запись</button></div>}</article>)}
        <button disabled={sending} onClick={async () => { setSending(true); try { await flushQueue(); await update(); await refresh(); } finally { setSending(false); } }}>{sending ? 'Отправляем…' : 'Отправить при наличии связи'}</button>
    </section>;
}

