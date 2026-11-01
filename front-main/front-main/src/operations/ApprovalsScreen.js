import React from 'react';
import ApprovalsList from './ApprovalsList';
import { approvalItems } from './approvals';

export default function ApprovalsScreen({ data, user, onNavigate }) {
    const items = approvalItems(data, user);
    return <section className="op-card op-approvals-page">
        <div className="op-section-heading"><div><h2>Согласования</h2><p className="op-muted">Что ждёт вашего решения.</p></div><span className={'op-approvals-count' + (items.length ? ' active' : '')}>{items.length || '0'}</span></div>
        <ApprovalsList items={items} onOpen={item => onNavigate(item.section, item.intent)} />
    </section>;
}
