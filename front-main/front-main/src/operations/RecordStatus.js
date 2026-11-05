import React from 'react';
import {moneyFmt} from './api';
import Icon from './Icon';
export function PendingRecord({operation,busy,stored,onRetry,title,amount=operation.body.amount}){
 return <section className="op-card ux-record-status" aria-live="polite"><span className="suite-icon tone-warning"><Icon name="clock"/></span><h2>{busy?'Сохраняем…':operation.rejected?'Нужно исправить':'Ожидает подтверждения'}</h2><p>{title}</p><strong>{moneyFmt(amount)} ₸</strong>{operation.error&&<p role="alert" className="op-missing">{operation.error} Уберите отклонённую запись в очереди выше, затем исправьте форму.</p>}<p className="op-muted">{busy?'Не закрывайте форму.':'Проверим прежний номер записи. Дубликат не появится.'}</p>{!stored&&<p className="op-missing">Не удалось сохранить номер на телефоне. Не закрывайте приложение.</p>}<button disabled={busy||operation.rejected} onClick={onRetry}>Проверить сохранение</button></section>;
}
export function RecordedResult({title,amount,onOpen,onAnother,onBack}){
 return <section className="op-card ux-record-status" role="status"><span className="suite-icon tone-stock"><Icon name="check"/></span><h2>Записано</h2><p>{title}</p><strong>{moneyFmt(amount)} ₸</strong><div className="op-actions">{onOpen&&<button onClick={onOpen}>Открыть запись</button>}<button className={onOpen?'secondary':''} onClick={onAnother}>Добавить ещё</button><button className="ghost" onClick={onBack}>Готово</button></div></section>;
}
