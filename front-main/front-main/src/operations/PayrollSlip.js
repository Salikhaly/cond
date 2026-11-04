import React, { useMemo } from 'react';
import { fmt, moneyFmt } from './api';
import { payrollMetrics } from './payrollMetrics';

const monthTitle = month => new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));

export default function PayrollSlip({ data, person, month, onClose }) {
    const slip = useMemo(() => {
        const metrics = payrollMetrics(data, person.id, month);
        const adjustments = (data.wageAdjustments || []).filter(row => Number(row.userId) === Number(person.id) && String(row.date).slice(0, 7) === month);
        const premiums = adjustments.filter(row => Number(row.amount) > 0).reduce((sum, row) => sum + Number(row.amount), 0);
        const deductions = adjustments.filter(row => Number(row.amount) < 0).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
        return { metrics, premiums, deductions, adjustments };
    }, [data, person.id, month]);
    const m = slip.metrics;
    return <section className="op-card op-print-document">
        <div className="op-actions op-no-print"><button onClick={() => window.print()}>Печать / PDF</button><button className="secondary" onClick={onClose}>Назад</button></div>
        <h2>Расчётный лист за {monthTitle(month)}</h2>
        <p><b>{person.name}</b>{person.role === 'representative' ? ' · торговый представитель' : ' · работник производства'}</p>
        <table className="op-slip-table"><tbody>
            <tr><td>Начислено за месяц</td><td>{moneyFmt(m.accrued)} ₸</td></tr>
            {m.fixedAccrued > 0 && <tr><td>В том числе оклад</td><td>{moneyFmt(m.fixedAccrued)} ₸</td></tr>}
            {m.volumeAccrued>0&&<tr><td>В том числе выработка</td><td>{moneyFmt(m.volumeAccrued)} ₸</td></tr>}
            <tr><td>Премии</td><td>{moneyFmt(slip.premiums)} ₸</td></tr>
            <tr><td>Удержания</td><td>−{moneyFmt(slip.deductions)} ₸</td></tr>
            <tr><td>Авансы</td><td>{moneyFmt(m.advancePaid)} ₸</td></tr>
            <tr><td>Зарплата выплачена</td><td>{moneyFmt(m.salaryPaid)} ₸</td></tr>
            <tr><td><b>К выдаче</b></td><td><b>{moneyFmt(Math.max(0, m.due))} ₸</b></td></tr>
            {m.due < 0 && <tr><td>Переплата</td><td>{moneyFmt(Math.abs(m.due))} ₸</td></tr>}
        </tbody></table>
        {slip.adjustments.length > 0 && <><h3>Изменения начисления</h3><table className="op-slip-table"><tbody>{slip.adjustments.map(row => <tr key={row.id}><td>{row.date} · {row.reason}</td><td>{Number(row.amount) > 0 ? '+' : '−'}{moneyFmt(Math.abs(row.amount))} ₸</td></tr>)}</tbody></table></>}
        <div className="op-signatures"><span>Работник: __________</span><span>Бухгалтер: __________</span></div>
        <p className="op-muted">Суммы указаны по подтверждённым начислениям и выплатам. Налоги не удержаны.</p>
    </section>;
}
