import { cached, remember, canQueue, enqueue, queued, removeQueued, saveQueued, readCache, writeCache, projectDashboard } from './offline';
import { calculationEstimate } from './calculationEstimate';
let refreshing;
let uploading;
export async function flushQueue() {
    if (uploading) return uploading;
    uploading = (async () => {
        for (const row of await queued()) {
            if (row.error) break;
            try {
                let path = row.path,body=row.body;
                if (/^\/operations\/productions\//.test(path)) {
                    const id = path.split('/')[3], actual = await readCache(row.owner + ':id:' + id);
                    if(actual?.kind==='late_request'&&path.endsWith('/cancel')){path='/operations/wage-requests/'+actual.id+'/reject';body={reason:'Автор отменил запись, сохранённую на телефоне'};}
                    else if(actual)path=path.replace(id,typeof actual==='object'?actual.id:actual);
                }
                const result = await request(path,body,row.method,row.id,true);
                if(row.path==='/operations/productions')await writeCache(row.owner+':id:'+row.id,result.kind==='late_request'?{id:result.id,kind:result.kind}:result.id);
                await writeCache(row.owner+':result:'+row.id,result);
                await removeQueued(row.id);
            }
            catch (e) { if (!e.network) { row.error = e.message; await saveQueued(row); } break; }
        }
    })().finally(() => { uploading = null; });
    return uploading;
}
export async function request(path, body, method, operationId, sendingQueue=false) {
    const verb = method || (body === undefined ? 'GET' : 'POST');
    if (!sendingQueue && canQueue(path, verb)) {
        const row = await enqueue(path, body, verb,operationId);
        await flushQueue();
        const pending = (await queued()).find(r => r.id === row.id);
        if (pending?.error) throw new Error(pending.error + '. Запись сохранена в очереди телефона.');
        if(!pending){const actual=await readCache(localStorage.getItem('cond-owner')+':result:'+row.id);if(actual)return actual;}
        if(operationId&&pending){const e=new Error('Запись сохранена на телефоне. Сервер ещё не подтвердил её. Отправка повторится с тем же номером, без дубликата.');e.network=true;throw e;}
        return { pending: Boolean(pending), id: row.id };
    }
    const send = () => fetch('/api' + path, {
        method: verb, credentials: 'include', signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}`, ...(operationId ? { 'X-Operation-Id': operationId } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    let response;
    try { response = await send(); }
    catch (e) {
        if (verb === 'GET' && ['/operations/me', '/operations/dashboard','/operations/trade-finance'].includes(path)) { const data = await cached(path); return path.endsWith('/dashboard') ? projectDashboard(data) : data; }
        if (path === '/operations/preview') return offlineCalculation(body);
        const error = new Error('Нет связи. Повторим, когда появится сеть.'); error.network = true; throw error;
    }
    if (response.status >= 500) {
        if(path.startsWith('/operations/account/')||path==='/operations/staff-invitations'){
            const data=await response.json().catch(()=>null);throw new Error(data?.message||'Отправка писем временно недоступна');
        }
        if (verb === 'GET' && ['/operations/me', '/operations/dashboard','/operations/trade-finance'].includes(path)) { const data = await cached(path); return path.endsWith('/dashboard') ? projectDashboard(data) : data; }
        if (path === '/operations/preview') return offlineCalculation(body);
        const error = new Error('Сервер временно недоступен. Повторим отправку позже.'); error.network = true; throw error;
    }
    if (response.status === 401 && !['/operations/session', '/auth/login', '/auth/activate'].includes(path)) {
        if (!refreshing) refreshing = fetch('/api/auth/refresh', { credentials: 'include', signal:AbortSignal.timeout(8000) }).then(async r => {
            if (!r.ok) {
                if ([401,403].includes(r.status)) window.dispatchEvent(new Event('cond-session-ended'));
                const error = new Error(r.status >= 500 ? 'Сервер временно недоступен' : 'Войдите в аккаунт'); error.network = r.status >= 500; throw error;
            }
            const data = await r.json(); localStorage.setItem('token', data.accessToken);
        }).catch(e => { if (e instanceof TypeError || e.name === 'TimeoutError') e.network = true; throw e; }).finally(() => { refreshing = null; });
        await refreshing;
        response = await send();
    }
    let data;try{data=await response.json();}catch{const error=new Error('Сервер не ответил. Повторите.');error.network=true;throw error;}
    if (!response.ok) throw new Error(data.message || (response.status === 403 ? 'Нет доступа' : 'Не получилось. Повторите.'));
    await remember(path, data);
    return path === '/operations/dashboard' ? projectDashboard(data) : data;
}
async function offlineCalculation(body) {
    const d = await cached('/operations/dashboard'), recipe = d.recipes?.find(r => Number(r.productId) === Number(body.productId)), product = d.products.find(p => Number(p.id) === Number(body.productId));
    const kg = Number(body.kg);
    if (!recipe || !product || !(kg > 0)) throw new Error('Для расчёта на телефоне сначала загрузите рецептуру с сервера');
    const policy=(d.workPolicies||[]).filter(p=>p.userId===Number(body.workerId)&&p.startsOn<=(body.date||today())).sort((a,b)=>b.startsOn.localeCompare(a.startsOn))[0];
    const rate=policy?.pieceRates?.find(r=>r.productId===product.id);
    const calc=calculationEstimate({recipe,materials:d.materials,packKg:product.packKg,laborPerPack:rate&&product.packKg?Number(rate.rate)*(rate.unit==='pack'?1:Number(product.packKg)):product.packLaborPerPack,ratePerKg:rate?Number(rate.rate)/(rate.unit==='pack'?Number(product.packKg):1):product.priceForEmployee,kg,workMode:policy?.mode||'piece'});
    if(calc.tooSmall)throw new Error('Слишком малый выпуск для точности учёта');
    return {...calc,productId:product.id,productName:product.name,_offline:true};
}
export const api = (path, body, method, operationId) => request('/operations' + path, body, method, operationId);
export const fmt = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(Number(value || 0));
export const moneyFmt = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value || 0));
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export async function downloadExchange() {
    const data = await api('/exchange');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'cond-exchange.json'; a.click(); URL.revokeObjectURL(url);
}
