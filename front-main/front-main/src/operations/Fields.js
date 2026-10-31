import React from 'react';
import NumericInput from './SafeNumericInput';
export function Field({ label, children, ...props }) {
    return <label className="op-field"><span>{label}</span>{children || (props.type==='number'?<NumericInput {...props}/>:<input {...props}/>)}</label>;
}
export function Select({ label, value, onChange, items, placeholder = 'Выберите…', required = true }) {
    return <Field label={label}><select aria-label={label} required={required} value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>;
}
export function Empty({ children }) { return <div className="op-empty">{children}</div>; }
export function Badge({ status }) {
    const labels = { draft: 'Ожидает проведения', posted: 'Проведено', cancelled: 'Отменено', submitted: 'Новая заявка', approved: 'Согласовано', shipped: 'Отгружено' };
    return <span className={'op-badge ' + status}>{labels[status] || status}</span>;
}
export function Table({ headers, children, mobileCards = false }) {
    const rows = mobileCards ? React.Children.map(children, row => React.isValidElement(row) && row.type === 'tr'
        ? React.cloneElement(row, {}, React.Children.map(row.props.children, (cell, i) => React.isValidElement(cell)
            ? React.cloneElement(cell, { 'data-label': headers[i] }) : cell)) : row) : children;
    return <div className="op-table-wrap"><table className={mobileCards ? 'op-mobile-cards' : undefined}><thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>;
}
