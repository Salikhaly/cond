import React, { useMemo, useState } from 'react';
import { api, moneyFmt } from './api';
import { Field } from './Fields';
import './timesheet.css';

const marks = {
    worked: { short: 'Я', label: 'Работал' },
    off: { short: 'В', label: 'Выходной' },
    vacation: { short: 'О', label: 'Отпуск' },
    sick: { short: 'Б', label: 'Больничный' },
    absent: { short: 'Н', label: 'Не вышел' },
    reported: { short: '?', label: 'На проверке' },
};
const reasons = [
    ['Выходной', 'В'],
    ['Отпуск', 'О'],
    ['Больничный', 'Б'],
    ['Не вышел', 'Н'],
];
const reasonMark = comment => {
    const value = String(comment || '').toLowerCase();
    if (value.includes('отпуск')) return 'vacation';
    if (value.includes('больнич')) return 'sick';
    if (value.includes('не вышел') || value.includes('прогул')) return 'absent';
    return 'off';
};
const monthTitle = month => new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function Timesheet({ data, person, month, run, busy }) {
    const [editing, setEditing] = useState(null);
    const [mark, setMark] = useState('Выходной');
    const [comment, setComment] = useState('');
    const rows = useMemo(() => {
        const [year, monthNumber] = month.split('-').map(Number);
        const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
        const days = [];
        for (let number = 1; number <= last; number += 1) {
            const date = month + '-' + String(number).padStart(2, '0');
            const workDay = (data.workDays || []).find(row => row.userId === person.id && row.date === date);
            const productions = (data.productions || []).filter(row => row.workerId === person.id && row.status === 'posted' && row.date === date);
            const daily = (data.dailyPay || []).find(row => row.userId === person.id && row.date === date);
            const status = workDay?.status === 'reported' ? 'reported' : workDay?.status === 'worked' || productions.length ? 'worked' : workDay ? reasonMark(workDay.comment) : '';
            days.push({
                number,
                date,
                weekday: new Date(date + 'T12:00:00Z').getUTCDay(),
                status,
                comment: workDay?.comment || '',
                boxes: productions.reduce((sum, row) => sum + Number(row.boxes || 0), 0),
                earned: Number(daily?.amount || 0),
            });
        }
        return days;
    }, [data, person.id, month]);
    const worked = rows.filter(row => row.status === 'worked').length;
    const vacation = rows.filter(row => row.status === 'vacation').length;
    const sick = rows.filter(row => row.status === 'sick').length;
    const absent = rows.filter(row => row.status === 'absent').length;
    const boxes = rows.reduce((sum, row) => sum + row.boxes, 0);
    const earned = rows.reduce((sum, row) => sum + row.earned, 0);
    const offset = rows.length ? (rows[0].weekday + 6) % 7 : 0;
    const open = row => {
        if (busy || row.boxes > 0) return;
        setEditing(row);
        setMark(row.status === 'vacation' ? 'Отпуск' : row.status === 'sick' ? 'Больничный' : row.status === 'absent' ? 'Не вышел' : 'Выходной');
        setComment(row.comment || '');
    };
    const save = () => {
        if (!editing) return;
        run(async () => {
            const workedDay = mark === 'Работал';
            await api('/work-days', { userId: person.id, date: editing.date, status: workedDay ? 'worked' : 'off', comment: workedDay ? '' : (comment || mark) });
            setEditing(null);
        }, 'Отметка в табеле сохранена');
    };
    return <section className="op-card">
        <div className="op-section-heading"><div><span className="op-eyebrow">ТАБЕЛЬ</span><h2>{monthTitle(month)}</h2><p className="op-muted">{person.name}</p></div><span className="op-badge posted">{worked} раб. дней</span></div>
        <div className="op-timesheet-summary">
            <div><span>Работал</span><b>{worked}</b></div>
            <div><span>Отпуск</span><b>{vacation}</b></div>
            <div><span>Больничный</span><b>{sick}</b></div>
            <div className={absent ? 'bad' : ''}><span>Не вышел</span><b>{absent}</b></div>
            <div><span>Коробок</span><b>{boxes}</b></div>
            <div><span>Начислено</span><b>{moneyFmt(earned)} ₸</b></div>
        </div>
        <div className="op-timesheet-calendar">
            {weekdays.map(day => <div key={day} className="op-timesheet-weekday">{day}</div>)}
            {Array.from({ length: offset }).map((_, index) => <div key={'empty-' + index} className="op-timesheet-day empty" />)}
            {rows.map(row => <button key={row.date} type="button" className={'op-timesheet-day ' + (row.status || 'unmarked')} disabled={busy || row.boxes > 0} onClick={() => open(row)} title={row.date + (row.comment ? ' · ' + row.comment : '')}>
                <span className="op-timesheet-number">{row.number}</span>
                {row.status && <b className="op-timesheet-letter">{marks[row.status]?.short}</b>}
                {row.boxes > 0 && <small>{row.boxes}</small>}
            </button>)}
        </div>
        <div className="op-timesheet-legend">{[['worked', 'Я работал'], ['off', 'В выходной'], ['vacation', 'О отпуск'], ['sick', 'Б больничный'], ['absent', 'Н не вышел'], ['reported', '? на проверке']].map(([status, label]) => <span key={status}><i className={'op-timesheet-dot ' + status} />{label}</span>)}</div>
        {rows.some(row => row.comment) && <div className="op-timesheet-comments">{rows.filter(row => row.comment).map(row => <span key={row.date}>{row.number}: {row.comment}</span>)}</div>}
        {editing && <div className="op-review-panel"><h3>Отметка на {editing.number} {monthTitle(month)}</h3><Field label="Что поставить"><select value={mark} onChange={e => setMark(e.target.value)}>{person.role === 'representative' && <option value="Работал">Я · Работал</option>}{reasons.map(([value, short]) => <option key={value} value={value}>{short} · {value}</option>)}</select></Field><Field label="Комментарий"><input maxLength={250} value={comment} onChange={e => setComment(e.target.value)} placeholder="Например: отпуск с 5 по 12" /></Field>{person.role === 'employee' && <p className="op-muted">Рабочий день производства подтверждается проведённым выпуском. Здесь отмечают выходной, отпуск, больничный или невыход.</p>}<div className="op-actions"><button disabled={busy} onClick={save}>Сохранить отметку</button><button className="secondary" onClick={() => setEditing(null)}>Отмена</button></div></div>}
        <p className="op-muted">Нажми на день, чтобы поставить отметку. Выходные, отпуск и больничный не считаются рабочими днями.</p>
    </section>;
}
