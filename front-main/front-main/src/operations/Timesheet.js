import React, { useMemo, useState } from 'react';
import { api, today, moneyFmt } from './api';
import { Field, Table, Empty } from './Fields';
import './timesheet.css';

const marks = {
    worked: { short: 'Я', label: 'Работал', tone: 'posted' },
    off: { short: 'В', label: 'Выходной', tone: 'submitted' },
    vacation: { short: 'О', label: 'Отпуск', tone: 'submitted' },
    sick: { short: 'Б', label: 'Больничный', tone: 'submitted' },
    absent: { short: 'Н', label: 'Не вышел', tone: 'error' },
    reported: { short: '?', label: 'На проверке', tone: 'draft' },
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
                weekday: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')),
                status,
                comment: workDay?.comment || '',
                boxes: productions.reduce((sum, row) => sum + Number(row.boxes || 0), 0),
                earned: Number(daily?.amount || 0),
                locked: Boolean(workDay && workDay.status !== 'reported') || productions.length > 0,
            });
        }
        return days;
    }, [data, person.id, month]);
    const worked = rows.filter(row => row.status === 'worked').length;
    const off = rows.filter(row => ['off', 'vacation', 'sick', 'absent'].includes(row.status)).length;
    const open = row => {
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
        <div className="op-section-heading"><div><span className="op-eyebrow">ТАБЕЛЬ</span><h2>{monthTitle(month)}</h2><p className="op-muted">{person.name} · работал {worked} · выходных/отсутствий {off}</p></div><span className="op-badge posted">{worked} Я</span></div>
        {rows.length ? <Table mobileCards headers={['День', 'Отметка', 'Коробок', 'Начислено', 'Комментарий', '']}>{rows.map(row => <tr key={row.date} className={row.status ? '' : 'op-timesheet-empty'}><td><b>{row.number}</b> <small>{row.weekday}</small></td><td><span className={'op-timesheet-mark ' + (row.status || 'empty')}>{row.status ? marks[row.status]?.short || '—' : '·'}</span> <small>{row.status ? marks[row.status]?.label : 'не отмечен'}</small></td><td>{row.boxes ? row.boxes + ' кор.' : '—'}</td><td>{row.earned ? moneyFmt(row.earned) + ' ₸' : '—'}</td><td>{row.comment || '—'}</td><td><button className="secondary" disabled={busy || row.boxes > 0} onClick={() => open(row)}>Изменить</button></td></tr>)}</Table> : <Empty>В этом месяце пока нет дней.</Empty>}
        {editing && <div className="op-review-panel"><h3>Отметка на {editing.number} {monthTitle(month)}</h3><Field label="Что поставить"><select value={mark} onChange={e => setMark(e.target.value)}>{person.role === 'representative' && <option value="Работал">Я · Работал</option>}{reasons.map(([value, short]) => <option key={value} value={value}>{short} · {value}</option>)}</select></Field><Field label="Комментарий"><input maxLength={250} value={comment} onChange={e => setComment(e.target.value)} placeholder="Например: отпуск с 5 по 12" /></Field>{person.role === 'employee' && <p className="op-muted">Рабочий день производства подтверждается проведённым выпуском. Здесь можно отметить выходной, отпуск, больничный или невыход.</p>}<div className="op-actions"><button disabled={busy} onClick={save}>Сохранить отметку</button><button className="secondary" onClick={() => setEditing(null)}>Отмена</button></div></div>}
        <p className="op-muted">Табель влияет на расчёт зарплаты: выходные, отпуск и больничный не считаются рабочими днями.</p>
    </section>;
}
