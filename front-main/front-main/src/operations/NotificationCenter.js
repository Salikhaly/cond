import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import ApprovalsList from './ApprovalsList';
import { approvalItems, firstApprovalText } from './approvals';

export default function NotificationCenter({ data, user, onNavigate, onNotice }) {
    const items = approvalItems(data, user);
    const count = items.length;
    const previous = useRef(count);
    const [pulse, setPulse] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (count <= previous.current) { previous.current = count; return; }
        previous.current = count;
        setPulse(true);
        if (items[0]) onNotice?.({ text: 'Новое: ' + firstApprovalText(items) });
        const timer = setTimeout(() => setPulse(false), 4200);
        return () => clearTimeout(timer);
    }, [count]);

    useEffect(() => {
        if (!open) return;
        const close = event => { if (event.key === 'Escape') setOpen(false); };
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', close);
        return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
    }, [open]);

    if (!user || user.role !== 'super_admin') return null;
    const go = item => { setOpen(false); onNavigate?.(item.section, item.intent); };

    return <>
        <button type="button" className={'op-notification-bell' + (pulse ? ' is-pulsing' : '')} aria-label={'Согласования: ' + count} onClick={() => setOpen(true)}>
            <Icon name="bell" size={20} />
            {count > 0 && <span className="op-notification-badge">{count > 99 ? '99+' : count}</span>}
        </button>
        {open && createPortal(<div className="op-sheet-backdrop" onClick={() => setOpen(false)}>
            <section className="op-sheet" role="dialog" aria-modal="true" aria-label="Согласования" onClick={event => event.stopPropagation()}>
                <span className="op-sheet-grab" aria-hidden="true" />
                <div className="op-sheet-head"><div><small>НУЖНО ПОДТВЕРДИТЬ</small><h2>{!count ? 'Всё спокойно' : count === 1 ? '1 ждёт решения' : count + ' ждут решения'}</h2></div><button type="button" className="ghost" onClick={() => setOpen(false)}>Закрыть</button></div>
                <ApprovalsList items={items.slice(0, 6)} onOpen={go} />
                {count > 0 && <button type="button" className="op-wide-action" onClick={() => { setOpen(false); onNavigate?.('approvals'); }}>Все согласования · {count}</button>}
            </section>
        </div>, document.body)}
    </>;
}
