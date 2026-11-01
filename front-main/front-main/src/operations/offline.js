// Device-local storage. Never reports an unconfirmed operation as posted.
let opened;
function database() {
    if (!opened) opened = new Promise((resolve, reject) => {
        const r = indexedDB.open('cond-phone-v1', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('cache'); r.result.createObjectStore('queue', { keyPath: 'id' }); };
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    return opened;
}
async function access(store, mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode), request = action(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
}
export const readCache = key => access('cache', 'readonly', s => s.get(key));
export const writeCache = (key, value) => access('cache', 'readwrite', s => s.put(value, key));
const owner = () => localStorage.getItem('cond-owner');
export const queued = async () => (await access('queue', 'readonly', s => s.getAll())).filter(r => r.owner === owner()).sort((a, b) => a.created - b.created);
export const removeQueued = id => access('queue', 'readwrite', s => s.delete(id));
export const saveQueued = row => access('queue', 'readwrite', s => s.put(row));
export async function enqueue(path, body, method, operationId) {
    if (!owner()) throw new Error('Сначала войдите в аккаунт при подключении к серверу');
    if(operationId){const prior=(await queued()).find(r=>r.id===operationId);if(prior){if(prior.path!==path||prior.method!==method||JSON.stringify(prior.body)!==JSON.stringify(body))throw new Error('Сохранённая операция имеет другой состав. Сначала завершите её отправку.');return prior;}}
    if (/^\/operations\/(productions|receipts|orders|wage-requests)\//.test(path)) {
        const existing = (await queued()).find(r => r.path === path && r.method === method && JSON.stringify(r.body) === JSON.stringify(body));
        if (existing) return existing;
    }
    const uuid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
    const row = { id: operationId||uuid(), owner: owner(), path, body: JSON.parse(JSON.stringify(body)), method, created: Date.now(), error: null };
    await saveQueued(row); return row;
}
export function canQueue(path, method) {
    return method === 'POST' && (/^\/operations\/(receipts|productions|orders|payments|advances|expenses|returns|wage-requests|work-days|cash)$/.test(path) || /^\/operations\/(productions\/[^/]+\/(post|cancel)|receipts\/[^/]+\/pay|wage-requests\/[^/]+\/(reply|propose|post|reject)|cash\/[^/]+\/(allocate|reverse)|receipt-drafts\/[^/]+\/post|expenses\/[^/]+\/reverse)$/.test(path)) || method === 'PATCH' && /^\/operations\/orders\/[^/]+$/.test(path);
}
export async function cached(path) {
    const saved = await readCache(owner() + ':' + path);
    if (!saved) throw new Error('На телефоне ещё нет данных. Откройте приложение один раз с подключением к серверу.');
    return { ...saved.value, _offline: true, _savedAt: saved.at };
}
export async function projectDashboard(data) {
    const pending = await queued();
    const me=(await readCache(owner()+':/operations/me'))?.value;
    const wageRequests=[...(data.wageRequests||[])],workDays=[...(data.workDays||[])];
    for(const row of pending.filter(r=>r.path==='/operations/wage-requests'&&!r.error))wageRequests.unshift({...row.body,id:row.id,userId:me?.role==='super_admin'?Number(row.body.userId):me?.id,status:'pending_upload',createdBy:me?.id,createdByName:me?.name||'Вы',_pending:true,createdAt:new Date(row.created).toISOString()});
    for(const row of pending.filter(r=>r.path==='/operations/work-days'&&!r.error)){const userId=me?.role==='super_admin'?Number(row.body.userId):me?.id,index=workDays.findIndex(d=>d.userId===userId&&d.date===row.body.date),value={...row.body,id:row.id,userId,status:'reported',_pending:true};if(index>=0)workDays[index]={...workDays[index],...value};else workDays.push(value);}
    data={...data,workDays,wageRequests:wageRequests.map(r=>({...r,_replyPending:pending.some(q=>!q.error&&q.path==='/operations/wage-requests/'+r.id+'/reply'),_posting:pending.some(q=>!q.error&&q.path==='/operations/wage-requests/'+r.id+'/post')}))};
    const orders=[...(data.orders||[])];
    for(const row of pending.filter(r=>r.path==='/operations/orders'&&!r.error)){
        const outlet=(data.outlets||[]).find(o=>o.id===row.body.outletId),customer=(data.customers||[]).find(c=>c.id===outlet?.customerId);
        orders.unshift({...row.body,id:row.id,company:customer?.name||row.body.company||data.company||'',lines:row.body.lines.map(l=>({...l,name:data.products.find(p=>p.id===l.productId)?.name||'Товар',price:null})),status:'submitted',total:0,_pending:true,destination:outlet?{outletName:outlet.name,customerName:customer?.name,address:outlet.address}:null});
    }
    data={...data,orders:orders.map(o=>({...o,_pending:o._pending||pending.some(r=>!r.error&&r.path==='/operations/orders/'+o.id)}))};
    const returns=[...(data.returns||[])];
    for(const row of pending.filter(r=>r.path==='/operations/returns'&&!r.error)){
        const order=orders.find(o=>o.id===row.body.orderId);if(!order)continue;
        const lines=row.body.lines.map(l=>{const source=order.lines.find(p=>Number(p.productId)===Number(l.productId));return {...l,name:source?.name||'Товар',price:source?.price||0,amount:Math.round(Number(l.kg)*Number(source?.price||0)*100)/100}});
        returns.unshift({...row.body,id:row.id,status:'requested',lines,total:lines.reduce((s,l)=>s+l.amount,0),customer:{company:order.company,destination:order.destination},createdByName:'Вы',createdAt:new Date(row.created).toISOString(),_pending:true});
    }
    data={...data,returns};
    if (!data.productions) return data;
    const productions = [...data.productions];
    for (const row of pending.filter(r => r.path === '/operations/productions' && !r.error)) {
        productions.unshift({ ...row.body, id: row.id, productId: Number(row.body.productId), workerId: me?.role === 'employee' ? me.id : Number(row.body.workerId), status: 'draft', _pending: true });
    }
    return { ...data, productions: productions.map(p => ({ ...p, _posting: pending.some(r => !r.error && r.path === `/operations/productions/${p.id}/post`) })) };
}
export async function remember(path, value) {
    if (path === '/operations/me' || path === '/operations/session' || path === '/auth/activate') {
        const user = value.user || value;
        if (user.id) {
            const previous = await readCache(user.id + ':/operations/me');
            if (previous && (previous.value.role !== user.role||JSON.stringify(previous.value.authority)!==JSON.stringify(user.authority))) {await writeCache(user.id + ':/operations/dashboard', null);await writeCache(user.id+':/operations/trade-finance',null);}
            localStorage.setItem('cond-owner', String(user.id)); await writeCache(user.id + ':/operations/me', { value: user, at: Date.now() });
        }
    }
    if (['/operations/dashboard','/operations/trade-finance'].includes(path)) await writeCache(owner() + ':' + path, { value, at: Date.now() });
}
