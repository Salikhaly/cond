import React, { useEffect, useState } from 'react';
import { api } from './api';

export default function Connection({ user, run, busy, offline=false }) {
    const [status, setStatus] = useState(null);
    const [reachable, setReachable] = useState(true);
    useEffect(() => {
        let active = true;
        const update = () => api('/sync/status').then(s => { if (active) { setStatus(s); setReachable(true); } }).catch(() => { if (active) setReachable(false); });
        update(); const timer = setInterval(update, 10000);
        return () => { active = false; clearInterval(timer); };
    }, [user.id]);
    if(offline)return null;
    if (!reachable) return <div className="op-alert" role="status">Работаем с данными телефона. Новые записи ждут отправки серверу.</div>;
    if (!status) return null;
    if (status.mode === 'cloud') return <div className="op-alert" role="status">Копия для просмотра · обновлено {status.lastSentAt ? new Date(status.lastSentAt).toLocaleString('ru-RU') : 'ещё не получено'}. Новые операции вводятся на основном сервере.</div>;
    if(!status.error&&(!status.configured||!status.pending))return null;
    return <div className="op-connection" role="status"><div><strong>{status.error?'Не удалось обновить облако':'В облако не отправлено: '+status.pending}</strong>{status.configured && <><br /><small>{status.pending ? 'Есть изменения для отправки внешней копии.' : 'Внешняя копия обновлена.'}</small></>}{status.error && <p>{status.error}</p>}</div>
        {user.role === 'super_admin' && status.configured && <button className="secondary" disabled={busy} onClick={() => run(async () => { setStatus(await api('/sync/send', {})); }, 'Данные отправлены на внешний сервер')}>Отправить сейчас</button>}
    </div>;
}
