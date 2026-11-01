import React from 'react';
import Icon from './Icon';

const icons = { order: 'orders', wage: 'payroll', late: 'production', day: 'team', return: 'returns', production: 'production' };

export default function ApprovalsList({ items = [], onOpen, empty = 'Нет новых согласований' }) {
    if (!items.length) return <p className="op-approval-empty">{empty}</p>;
    return <div className="op-approval-list">
        {items.map(item => <button type="button" className="op-approval-row" key={item.id} onClick={() => onOpen?.(item)}>
            <span className={'op-approval-icon tone-' + item.kind}><Icon name={icons[item.kind] || 'check'} size={19} /></span>
            <span className="op-approval-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
            <span className="op-approval-action">{item.actionLabel}<Icon name="forward" size={15} /></span>
        </button>)}
    </div>;
}
