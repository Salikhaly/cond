const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const fmt = value => number.format(Number(value) || 0);

const wageLabels = {
    late_production: 'прошлый выпуск',
    adjustment: 'корректировка',
    policy: 'условия оплаты',
    daily_reduction: 'процент',
    daily_basis: 'маржа дня',
    attendance: 'смена',
    monthly_commission: 'оклад'
};

function shortDate(value) {
    if (!value) return '';
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(8, 10) + '.' + text.slice(5, 7);
    return '';
}

function personName(data, id) {
    const people = [...(data.payees || []), ...(data.workers || []), ...(data.users || [])];
    return people.find(p => Number(p.id) === Number(id))?.name || 'Сотрудник';
}

function orderKg(order) {
    return (order.lines || []).reduce((sum, line) => sum + Number(line.kg || 0), 0);
}

export function approvalItems(data = {}, user) {
    if (!user || user.role !== 'super_admin') return [];
    const permissions = data.permissions || {};
    const items = [];
    const add = item => items.push(item);

    if (permissions.orders !== false) {
        for (const order of data.orders || []) {
            if (order.status !== 'submitted') continue;
            add({
                id: 'order:' + order.id,
                kind: 'order',
                section: 'orders',
                intent: { kind: 'order', id: order.id },
                title: 'Заявка',
                subtitle: `${order.destination?.outletName || order.company || 'Клиент'} · ${fmt(orderKg(order))} кг`,
                actionLabel: 'Согласовать',
                priority: 2
            });
        }
    }

    if (permissions.payroll !== false) {
        for (const request of data.wageRequests || []) {
            if (request.type === 'late_production') {
                if (request.status !== 'submitted') continue;
                const kg = request.payload?.kg || request.proposal?.kg;
                add({
                    id: 'late:' + request.id,
                    kind: 'late',
                    section: 'payroll',
                    intent: { kind: 'wage-requests' },
                    title: 'Прошлый выпуск',
                    subtitle: `${personName(data, request.userId)}${kg ? ' · ' + fmt(kg) + ' кг' : ''}`,
                    actionLabel: 'Разрешить',
                    priority: 3
                });
                continue;
            }
            if (!['submitted', 'agreed', 'disputed'].includes(request.status)) continue;
            add({
                id: 'wage:' + request.id,
                kind: 'wage',
                section: 'payroll',
                intent: { kind: 'wage-requests' },
                title: request.status === 'disputed' ? 'Спор по зарплате' : 'Зарплата',
                subtitle: `${personName(data, request.userId)} · ${wageLabels[request.type] || 'проверка'}`,
                actionLabel: request.status === 'disputed' ? 'Решить' : 'Проверить',
                priority: request.status === 'disputed' ? 1 : 4
            });
        }
        for (const day of data.workDays || []) {
            if (day.status !== 'reported') continue;
            add({
                id: 'day:' + day.userId + ':' + day.date,
                kind: 'day',
                section: 'payroll',
                intent: { kind: 'work-day', userId: day.userId, date: day.date },
                title: 'Смена',
                subtitle: `${personName(data, day.userId)} · ${shortDate(day.date)}`,
                actionLabel: 'Подтвердить',
                priority: 6
            });
        }
    }

    if (permissions.orders !== false) {
        for (const request of data.returns || []) {
            if (request.status !== 'requested') continue;
            const kg = (request.lines || []).reduce((sum, line) => sum + Number(line.kg || 0), 0);
            add({
                id: 'return:' + request.id,
                kind: 'return',
                section: 'returns',
                intent: undefined,
                title: 'Возврат',
                subtitle: `${request.customer?.destination?.outletName || request.customer?.company || 'Клиент'} · ${fmt(kg)} кг`,
                actionLabel: 'Открыть',
                priority: 5
            });
        }
    }

    if (permissions.production !== false) {
        for (const production of data.productions || []) {
            if (production.status !== 'draft') continue;
            const product = (data.products || []).find(p => Number(p.id) === Number(production.productId));
            add({
                id: 'production:' + production.id,
                kind: 'production',
                section: 'production',
                intent: { kind: 'check-production', id: production.id },
                title: 'Выпуск на проверке',
                subtitle: `${product?.name || 'Продукция'} · ${fmt(production.kg)} кг`,
                actionLabel: 'Проверить',
                priority: 7
            });
        }
    }

    return items.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, 'ru'));
}

export function firstApprovalText(items) {
    const first = items[0];
    if (!first) return '';
    return `${first.title} · ${first.subtitle}`;
}
