import React, {useEffect,useState} from 'react';
import {api} from './api';
export default function TelegramSettings({run,busy}) {
    const [state,setState]=useState(null),[error,setError]=useState('');
    const load=async()=>{try{setState(await api('/telegram/status'));setError('');}catch(e){setError(e.message);}};
    useEffect(()=>{load();},[]);
    return <section className="op-card"><div className="op-section-heading"><h2>Telegram · группа цеха</h2><span className={'op-badge '+(state?.enabled&&state?.ready?'posted':'draft')}>{state?.blocked?'Демонстрация':state?.enabled&&state?.ready?'Настроен':'Не подключён'}</span></div>
        <p className="op-muted">Новая заявка или акт сотрудника → сообщение Нурлану и администратору. Из сообщения можно открыть документ.</p>
        {error&&<p className="op-missing" role="alert">{error}</p>}
        {state&&<>{state.demo&&!state.blocked&&<p className="op-plan-context">Демо подключено к группе. Тестовые сообщения помечены «Демо COND».</p>}<p>Напоминания: <b>{state.hours.map(h=>String(h).padStart(2,'0')+':00').join(' и ')}</b> · время Казахстана.{state.serverless&&' В демо запуск возможен в течение часа.'}</p>
        <p className="op-muted">Только если остались заявки или акты на проверке. При работе телефона без связи уведомление появится после отправки документа на сервер.</p>
        {state.blocked?<p className="op-plan-context">В публичном демо отправка в Telegram отключена. Бот можно подключить на сервере по разрешению владельца.</p>:<>
            {!state.ready&&<p className="op-plan-context">Для подключения нужны бот из @BotFather, группа с Нурланом и администратором и настройка на сервере.</p>}
            {state.ready&&<p className="op-muted">В очереди: {state.pending} · Ошибок: {state.failed}{state.lastSentAt?' · Последняя отправка: '+new Date(state.lastSentAt).toLocaleString('ru-RU'):''}</p>}
            {state.lastError&&<p className="op-missing" role="alert">{state.lastError}</p>}
            <div className="op-actions"><button disabled={busy||!state.enabled||!state.ready} onClick={()=>run(async()=>{await api('/telegram/test',{});await load();},'Проверочное сообщение добавлено в очередь. Оно придёт в группу в течение минуты при работающем сервере.')}>Отправить проверку в группу</button>
            <button className="secondary" disabled={busy} onClick={load}>Обновить статус</button>
            {state.failed>0&&<button className="secondary" disabled={busy||!state.enabled||!state.ready} onClick={()=>run(async()=>{await api('/telegram/retry',{});await load();},'Отправка будет повторена')}>Повторить после исправления</button>}</div>
        </>}</>}
    </section>;
}
