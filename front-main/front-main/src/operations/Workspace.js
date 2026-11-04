import React, { useCallback, useEffect, useRef, useState } from 'react';
import Connection from './Connection';
import PhoneQueue from './PhoneQueue';
import { queued } from './offline';
import { api, request, fmt } from './api';
import { Field, Empty } from './Fields';
import Materials from './Materials';
import Recipes from './Recipes';
import Production from './Production';
import Orders from './Orders';
import Payroll from './Payroll';
import Users from './Users';
import Suppliers from './Suppliers';
import { notificationLink } from './notificationLink';
import Returns from './Returns';
import Finance from './Finance';
import Overview from './Overview';
import Customers from './Customers';
import ProductCatalog from './ProductCatalog';
import './workspace.css';
import ExportActions from './ExportActions';
import Expenses from './Expenses';
import StockCounts from './StockCounts';
import ActionSearch from './ActionSearch';
import Icon,{Brand} from './Icon';
import ExpenseDirectory from './ExpenseDirectory';
import Packaging from './Packaging';
import HistoryWorkbook from './HistoryWorkbook';
import NotificationCenter from './NotificationCenter';
import ApprovalsScreen from './ApprovalsScreen';
const roles = { super_admin: 'Администратор', employee: 'Работник производства', representative: 'Торговый представитель' };
const tabs = {
    super_admin: [['overview', '◫', 'Обзор'], ['approvals', '✓', 'Согласования'], ['materials', '▧', 'Приходы и склад'], ['packaging', '▧', 'Упаковка'], ['catalog', '◈', 'Готовые товары'], ['shops', '▣', 'Клиенты'],['suppliers','▣','Поставщики'], ['recipes', '⌘', 'Калькуляции'], ['production', '◈', 'Производство'], ['orders', '▤', 'Заявки'], ['returns','↩','Обмен / Возврат'], ['expenses','expense','Расходы'],['directory','directory','Справочники'],['inventory','▦','Инвентаризация'],['payroll', '₸', 'Команда и зарплата'], ['finance', '▥', 'Отчёты и финансы'], ['history','directory','Данные февраля'], ['users', '⚙', 'Настройки']],
    employee: [['production', '◈', 'Моя выработка'], ['payroll', '₸', 'Моя зарплата']],
    representative: [['orders', '▤', 'Каталог и заказы'],['returns','↩','Обмен / Возврат'],['shops','▣','Мои магазины'],['payroll','₸','Моя зарплата']]
};
function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const publicDemo=process.env.PUBLIC_DEMO==='true';
    const local = process.env.LOCAL_DEMO === 'true'||publicDemo;
    async function submit(e) {
        e.preventDefault(); setBusy(true); setError('');
        try {
            const result = local ? await api('/session', { email, password }) : codeSent ? await request('/auth/activate', { email, code }) : await request('/auth/login', { email, password });
            if (!result.accessToken) { setCodeSent(true); return; }
            localStorage.setItem('token', result.accessToken); onLogin(result.user);
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    return <div className={"op-login"+(publicDemo?" op-public-demo":"")}><div className="op-login-intro"><Brand/><span className="op-eyebrow">ПРОИЗВОДСТВО ПОД КОНТРОЛЕМ</span><h1>От ингредиента<br />до отгрузки.</h1><p>Калькуляция, склад и работа команды —<br />в одном месте, с любого экрана.</p>{publicDemo&&<div className="op-bakery-photo" style={{backgroundImage:"url(/products/butter-cookies.jpg)"}} aria-hidden="true"/>}<div className="op-login-art"><span>Сырьё</span><i>→</i><span>Выпуск</span><i>→</i><span>Отгрузка</span></div></div>
        <section className="op-login-card"><h2>Вход в COND</h2>
            <form onSubmit={submit}><Field label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /><Field label="Пароль" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />{codeSent && <Field label="Код из письма" inputMode="numeric" required value={code} onChange={e => setCode(e.target.value)} />}{error && <div className="op-alert error" role="alert">{error}</div>}<button disabled={busy}>{busy ? 'Входим…' : codeSent ? 'Подтвердить вход' : 'Войти'}</button></form>
            {local && <div className="op-demo"><p>Демо-вход</p><div className="op-actions">{[['admin', 'Администратор'], ['worker', 'Работник'], ['firm', 'Представитель']].map(([id, name]) => <button key={id} type="button" className="secondary" onClick={() => { setEmail(`${id}@${publicDemo?'demo.test':'local.test'}`); setPassword(publicDemo?'CondDemo2026!':'Local2026!demo'); setError(''); }}>{name}</button>)}</div><small>{publicDemo?'Только тестовые данные':'Только локальные тестовые данные'}</small></div>}
        </section></div>;
}
export default function Workspace() {
    const [user, setUser] = useState(null);
    const [starting, setStarting] = useState(true);
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const [more, setMore] = useState(false);
    const [profileOpen,setProfileOpen]=useState(false);
    const [searchOpen,setSearchOpen]=useState(false);
    const [orderOutlet,setOrderOutlet]=useState('');
    const [intent, setIntent] = useState(null);
    const [online, setOnline] = useState(navigator.onLine);
    const mainRef = useRef(null);
    const authEpoch = useRef(0);
    const running = useRef(false);
    const mounted = useRef(true);
    const load = useCallback(async () => { const epoch = authEpoch.current; const d = await api('/dashboard'); if (mounted.current && epoch === authEpoch.current) setData(d); }, []);
    const login = useCallback(u => { setProfileOpen(false);setSearchOpen(false);const link=notificationLink(window.location.search,u.role);setOrderOutlet('');authEpoch.current++; setUser(u); setData(null); setTab(link?.section||tabs[u.role]?.[0][0] || 'overview');setIntent(link?.intent||null);setNotice(null); }, []);
    useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
    useEffect(() => {
        mounted.current = true;
        api('/me').then(login).catch(() => localStorage.removeItem('token')).finally(() => setStarting(false));
        return () => { mounted.current = false; };
    }, [login]);
    useEffect(() => {
        const expired = () => { authEpoch.current++; localStorage.removeItem('token'); localStorage.removeItem('cond-owner'); setUser(null); setData(null); setNotice(null); };
        window.addEventListener('cond-session-ended', expired);
        return () => window.removeEventListener('cond-session-ended', expired);
    }, []);
    useEffect(() => {
        if (!user) return;
        load().catch(e => setNotice({ error: true, text: e.message }));
        const timer = setInterval(() => { if (!running.current) load().catch(() => {}); }, 20000);
        const wake = () => { if (document.visibilityState === 'visible' && !running.current) load().catch(() => {}); };
        document.addEventListener('visibilitychange', wake);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', wake); };
    }, [user, load]);
    useEffect(() => {
        if (!notice || notice.error) return;
        const timer = setTimeout(() => setNotice(null), 4200);
        return () => clearTimeout(timer);
    }, [notice]);
    async function run(action, success) {

        if (running.current) return;
        running.current = true; setBusy(true); setNotice(null);
        try { await action(); await load(); if ((await queued()).length) setNotice({ text: 'Сохранено на телефоне. Ожидает отправки и проверки сервером.' }); else if (success) setNotice({ text: success }); }
        catch (e) { setNotice({ error: true, text: e.message }); }
        finally { running.current = false; setBusy(false); }
    }
    async function logout() {
        if ((await queued()).length) { setNotice({ error: true, text: 'Сначала отправьте записи с телефона. Они видны в очереди над формами.' }); return; }
        try { await request('/auth/logout', {}); authEpoch.current++; localStorage.removeItem('token'); localStorage.removeItem('cond-owner'); setUser(null); setData(null); }
        catch (e) { setNotice({ error: true, text: e.message }); }
    }
    if (starting) return <div className="op-loading">Загружаем рабочее место…</div>;
    if (!user) return <Login onLogin={login} />;
    const permissions=data?.permissions||user.authority?.permissions||{};
    const map={materials:'materials',packaging:'catalog',catalog:'catalog',recipes:'catalog',production:'production',orders:'orders',returns:'orders',shops:'customers',suppliers:'suppliers',payroll:'payroll',finance:'finance',users:'users',expenses:'cash',directory:'catalog',history:'finance',inventory:'inventory'};
    const nav=(tabs[user.role]||[]).filter(([id])=>user.role!=='super_admin'||(permissions[map[id]]!==false||id==='users'&&permissions.settings===true)).filter(([id])=>id!=='suppliers'||permissions.finance!==false);
    const allowedTab=nav.some(([id])=>id===tab)?tab:nav[0]?.[0];
    const current = nav.find(t => t[0] === allowedTab) || nav[0];
    const primary = user.role === 'super_admin' ? nav.filter(([id]) => ['overview', 'materials', 'orders', 'finance'].includes(id)) : nav;
    const secondary = nav.filter(([id]) => !primary.some(([main]) => main === id));
    const selectTab = (id, action = null) => { if(id==='finance'&&action?.kind==='expenses')id='expenses';if(id==='materials'&&action?.kind==='counts')id='inventory'; mainRef.current?.scrollTo({top:0});setIntent(action); setTab(id); setNotice(null); setMore(false);setProfileOpen(false);setSearchOpen(false); };
    return <div className={'op-app studio-app op-role-' + user.role+' suite-section-'+allowedTab}><ActionSearch open={searchOpen} onClose={()=>setSearchOpen(false)} nav={nav} data={data||{}} onNavigate={selectTab}/>
        <aside className="op-sidebar"><Brand/><span className="op-side-caption">УПРАВЛЕНИЕ ПРОИЗВОДСТВОМ</span><nav className="op-desktopnav" aria-label="Разделы">{nav.map(([id, icon, label]) => <button key={id} data-section={id} aria-current={allowedTab === id ? 'page' : undefined} className={allowedTab === id ? 'active' : ''} onClick={() => selectTab(id)}><span aria-hidden="true"><Icon name={id}/></span>{label}{id === 'orders' && data?.orders?.some(o => o.status === 'submitted') && <i />}</button>)}</nav>
<nav className="op-mobilenav" aria-label="Разделы на телефоне">{primary.map(([id, icon, label]) => <button key={id} data-section={id} aria-current={allowedTab === id ? 'page' : undefined} className={allowedTab === id ? 'active' : ''} onClick={() => selectTab(id)}><span aria-hidden="true"><Icon name={id}/></span>{id === 'materials' ? 'Приходы' : id === 'finance' ? 'Отчёты' : label}</button>)}{secondary.length > 0 && <button aria-expanded={more} className={secondary.some(([id]) => id === allowedTab) ? 'active' : ''} onClick={() => setMore(v => !v)}><span aria-hidden="true"><Icon name="more"/></span>Ещё</button>}</nav>
{more && <div className="op-more-menu">{secondary.map(([id, icon, label]) => <button key={id} onClick={() => selectTab(id)}><Icon name={id}/> {label}</button>)}</div>}<div className="op-side-bottom"><span className="op-local-dot" />{process.env.PUBLIC_DEMO==='true'?'Демонстрация':process.env.LOCAL_DEMO === 'true' ? 'Локальная версия' : 'Рабочая система'}<p>Сырьё → производство → отгрузка</p></div></aside>
        <div className="op-main" ref={mainRef}><header className="op-topbar"><div><span className="op-breadcrumb">Рабочее место /</span><h1><span className={'suite-section-icon section-'+allowedTab}><Icon name={allowedTab}/></span>{allowedTab==='overview'?'COND':current?.[2]}</h1></div><div className="studio-header-actions">{['finance','payroll','materials','suppliers','shops','catalog','expenses','inventory','recipes'].includes(allowedTab)&&<ExportActions compact title={current?.[2]||'Отчёт'}/>}<NotificationCenter data={data||{}} user={user} onNavigate={selectTab} onNotice={setNotice}/><button className="studio-header-search" aria-label="Поиск действий" disabled={!data} onClick={()=>{setSearchOpen(true);setProfileOpen(false);setMore(false);}}><Icon name="search"/></button><div className="cond-profile-wrap"><button className="cond-profile-button" aria-label="Профиль" aria-expanded={profileOpen} onClick={()=>setProfileOpen(v=>!v)}>{user.name?.slice(0,1)}</button>{profileOpen&&<div className="cond-profile-menu"><strong>{user.name}</strong><small>{user.role==='super_admin'&&user.authority?.owner?'Владелец бизнеса':roles[user.role]}</small><button onClick={logout}>Выйти из аккаунта</button><button className="cond-profile-close" onClick={()=>setProfileOpen(false)}>Закрыть</button></div>}</div></div></header>
            <main className="op-content" id="main-content"><PhoneQueue refresh={load} /><Connection user={user} run={run} busy={busy} offline={Boolean(data?._offline)} />{data?._offline && <div className="op-alert" role="status">Без сети · данные на {new Date(data._savedAt).toLocaleString("ru-RU")}.</div>}{!online&&!data?._offline && <div className="op-alert error" role="alert">Нет сети. Записи сохранятся и отправятся позже.</div>}{notice && <div className={'op-alert ' + (notice.error ? 'error' : 'success')} role={notice.error ? 'alert' : 'status'}>{notice.text}<button className="ghost" aria-label="Закрыть уведомление" onClick={() => setNotice(null)}>×</button></div>}
                {process.env.PUBLIC_DEMO==='true'&&<div className="op-demo-notice" role="status">Демо · тестовые данные</div>}{data?.presentation && <div className="op-demo-notice" role="status">Демо-база · основной учёт не изменяется</div>}
                {!data ? <div className="op-card">Загружаем данные… <button className="secondary" onClick={() => run(async () => {}, '')}>Повторить</button></div> : <>
                    
                    {allowedTab==='history'&&data?.isOwner&&<HistoryWorkbook onNavigate={selectTab}/>}
                    {allowedTab==='directory'&&<ExpenseDirectory data={data} run={run} busy={busy||Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab==='expenses'&&<Expenses onNavigate={selectTab} initialAction={intent} data={data} run={run} busy={busy||Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab==='inventory'&&<StockCounts data={data} run={run} busy={busy||Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab === 'overview' && <Overview data={data} setTab={selectTab} user={user} />}
                    {allowedTab === 'approvals' && <ApprovalsScreen data={data} user={user} onNavigate={selectTab} />}
                    {allowedTab === 'materials' && <Materials onPaySupplier={id=>selectTab('suppliers',{kind:'receipt-payment',id})} data={data} run={run} initialAction={intent} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab === 'packaging' && <Packaging data={data} run={run} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab === 'recipes' && <Recipes initialAction={intent} onNavigate={selectTab} data={data} run={run} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab === 'production' && <Production onNavigate={selectTab} data={data} user={user} run={run} initialAction={intent} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab === 'orders' && <Orders onReturn={id=>selectTab('returns',{kind:'return',orderId:id})} initialAction={intent} data={data} user={user} run={run} busy={busy || Boolean(data?.sync?.readOnly)} initialOutlet={orderOutlet} onShops={()=>selectTab('shops')} />}
                    {allowedTab==='shops'&&<Customers initialAction={intent} data={data} user={user} run={run} busy={busy || Boolean(data?.sync?.readOnly)} onOrder={id=>{setOrderOutlet(id);selectTab('orders')}}/>}
                    {allowedTab==='catalog'&&<ProductCatalog onProduce={id=>selectTab('production',{kind:'record-production',productId:id})} initialAction={intent} data={data} run={run} busy={busy || Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab==='returns'&&<Returns initialAction={intent} data={data} user={user} run={run} busy={busy||Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab === 'payroll' && <Payroll initialAction={intent} onNavigate={selectTab} data={data} user={user} run={run} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab==='suppliers'&&<Suppliers initialAction={intent} data={data} run={run} busy={busy||Boolean(data?.sync?.readOnly)}/>}
                    {allowedTab === 'users' && <Users data={data} run={run} busy={busy || Boolean(data?.sync?.readOnly)} />}
                    {allowedTab === 'finance' && <Finance initialAction={intent} onNavigate={selectTab} data={data} run={run} busy={busy || Boolean(data?.sync?.readOnly)} />}
                </>}
                <footer className="op-footer">COND <span><button className="ghost" disabled={busy} onClick={() => run(async () => {}, 'Данные обновлены')}>Обновить</button></span></footer>
            </main>
        </div>
    </div>;
}






import './comfort.css';
import './ios.css';
import './studio.css';
import './suite.css';
import './approvals.css';
import './design-system.css';
