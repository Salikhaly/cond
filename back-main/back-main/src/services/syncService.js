const { Op } = require('sequelize');
const { randomUUID, createHash, timingSafeEqual } = require('crypto');
const db = require('../database/sequelize');
const S = require('../models/sync');
const M = require('../models/operations');
const { User, Product, Salary, Income, Outcome, OutcomeCategory, BusinessRelation, Advance, Report, ReportProducts, BusinessRelationProducts } = require('../models/models');
const ApiError = require('../exceptions/ApiError');
const cloud = () => process.env.SYNC_ROLE === 'cloud';
const admin = user => { if (user.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор'); };
let sending;
function checksum(data) {
    // JSONB reorders object keys; hash the same canonical representation before
    // persistence and after restart/transport. Preserve array order.
    const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
    return createHash('sha256').update(JSON.stringify(canonical(JSON.parse(JSON.stringify(data))))).digest('hex');
}
function targetUrl() {
    if (!process.env.SYNC_CLOUD_URL) return null;
    const u = new URL(process.env.SYNC_CLOUD_URL);
    if (u.username || u.password || u.search || u.hash) throw new Error('Адрес сервера должен быть без пароля и параметров');
    if (u.protocol !== 'https:' && !(process.env.SYNC_ALLOW_LOCAL_HTTP === 'true' && u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname))) throw new Error('Для отправки нужен HTTPS');
    return u.href.replace(/\/$/, '');
}
async function initialise() {
    await S.State.findOrCreate({ where: { key: 'instance' }, defaults: { value: { sourceId: randomUUID() } } });
    await S.Replica.findOrCreate({ where: { key: 'primary' }, defaults: {} });
    if (cloud()) return;
    const [state] = await S.State.findOrCreate({ where: { key: 'queue-installed' }, defaults: { value: { installed: false } } });
    await db.transaction(async t => {
        await db.query(`CREATE OR REPLACE FUNCTION cond_queue_business_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
            INSERT INTO sync_changes ("transactionKey", "createdAt", "updatedAt") VALUES (txid_current(), now(), now()) ON CONFLICT ("transactionKey") DO NOTHING;
            RETURN NULL;
        END $$`, { transaction: t });
        const tables = [...Object.values(M), Product, User, Salary, Income, Outcome, OutcomeCategory, BusinessRelation, Advance, Report, ReportProducts, BusinessRelationProducts];
        for (const model of tables) {
            const table = model.getTableName();
            await db.query(`DROP TRIGGER IF EXISTS cond_sync_change ON "${table}"`, { transaction: t });
            await db.query(`CREATE TRIGGER cond_sync_change AFTER INSERT OR UPDATE OR DELETE ON "${table}" FOR EACH STATEMENT EXECUTE FUNCTION cond_queue_business_change()`, { transaction: t });
        }
        if (!state.value.installed) {
            await db.query('INSERT INTO sync_changes ("transactionKey", "createdAt", "updatedAt") VALUES (txid_current(), now(), now()) ON CONFLICT ("transactionKey") DO NOTHING', { transaction: t });
            await state.update({ value: { installed: true } }, { transaction: t });
        }
    });
}
async function capture(t) {
    const data = { schema: 'cond.replica.v1', capturedAt: new Date().toISOString() };
    for (const [key, model] of Object.entries(M).filter(([key])=>key!=='StaffContact')) data[key] = await model.findAll({ raw: true, transaction: t });
    for (const [key, model] of Object.entries({ products: Product, payroll: Salary, incomes: Income, outcomes: Outcome, categories: OutcomeCategory, relations: BusinessRelation, advances: Advance, reports: Report, reportProducts: ReportProducts, relationProducts: BusinessRelationProducts })) data[key] = await model.findAll({ raw: true, transaction: t });
    data.users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'], raw: true, transaction: t });
    return data;
}
async function status(user) {
    if (cloud()) {
        const replica = await S.Replica.findByPk('primary');
        return { mode: 'cloud', readOnly: true, configured: true, pending: 0, lastSentAt: replica.receivedAt, hasCopy: Boolean(replica.payload) };
    }
    const pending = await S.Change.count({ where: { sentAt: null } });
    const last = await S.Batch.findOne({ where: { sentAt: { [Op.ne]: null } }, order: [['id', 'DESC']], attributes: ['sentAt'] });
    const error = await S.State.findByPk('last-error');
    return { mode: 'local', configured: Boolean(process.env.SYNC_CLOUD_URL && process.env.SYNC_SHARED_KEY), pending, lastSentAt: last?.sentAt || null, ...(user.role === 'super_admin' ? { error: error?.value.message || null } : {}) };
}
async function prepare(target) {
    return db.transaction({ isolationLevel: 'REPEATABLE READ' }, async t => {
        await db.query('SELECT pg_advisory_xact_lock(42810012)', { transaction: t });
        const pending = await S.Batch.findOne({ where: { target, sentAt: null }, order: [['id', 'ASC']], transaction: t });
        if (pending) return pending;
        const events = await S.Change.findAll({ where: { sentAt: null }, attributes: ['id'], transaction: t });
        const prior = await S.Batch.findOne({ where: { target }, transaction: t });
        if (!events.length && prior) return null;
        const state = await S.State.findByPk('instance', { transaction: t });
        const payload = await capture(t);
        return S.Batch.create({ sourceId: state.value.sourceId, target, eventIds: events.map(e => e.id), payload, checksum: checksum(payload) }, { transaction: t });
    });
}
async function sendAll(user) {
    admin(user);
    if (cloud()) throw ApiError.badRequest('Отправка выполняется на локальном сервере');
    if (sending) return sending;
    sending = (async () => {
        const target = targetUrl();
        if (!target || !process.env.SYNC_SHARED_KEY) throw ApiError.badRequest('Внешний сервер пока не подключён. Данные сохранены локально.');
        try {
            for (let i = 0; i < 3; i++) {
                const batch = await prepare(target);
                if (!batch) break;
                const response = await fetch(target + '/api/sync/receive', {
                    method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.SYNC_SHARED_KEY },
                    body: JSON.stringify({ sourceId: batch.sourceId, version: String(batch.id), payload: batch.payload, checksum: batch.checksum })
                });
                const reply = await response.json();
                if (!response.ok || reply.sourceId !== batch.sourceId || String(reply.version) !== String(batch.id) || reply.checksum !== batch.checksum) throw new Error(response.ok ? 'Сервер не подтвердил получение данных' : (reply.message || 'Сервер отклонил копию'));
                await db.transaction(async t => {
                    const sentAt = new Date();
                    await batch.update({ sentAt }, { transaction: t });
                    // Acknowledge exact event IDs, never a sequence high-water mark:
                    // concurrent transactions may commit in a different order.
                    if (batch.eventIds.length) await S.Change.update({ sentAt }, { where: { id: batch.eventIds }, transaction: t });
                });
            }
            await S.State.upsert({ key: 'last-error', value: { message: null } });
            return status(user);
        } catch (e) {
            const message = e.name === 'TimeoutError' || e.message === 'fetch failed' ? 'Нет связи с внешним сервером. Всё сохранено локально; отправку можно повторить.' : String(e.message).slice(0, 300);
            await S.State.upsert({ key: 'last-error', value: { message } });
            throw ApiError.badRequest(message);
        }
    })().finally(() => { sending = null; });
    return sending;
}
async function receive(req) {
    if (!cloud()) throw ApiError.notFound();
    const key = process.env.SYNC_SHARED_KEY;
    const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!key || key.length < 32 || Buffer.byteLength(key) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(key), Buffer.from(supplied))) throw ApiError.unauthorizedRequest();
    const b = req.body;
    if (!b || !/^[0-9a-f-]{36}$/i.test(b.sourceId || '') || !/^\d+$/.test(String(b.version)) || !b.payload || b.payload.schema !== 'cond.replica.v1' || checksum(b.payload) !== b.checksum) throw ApiError.badRequest('Неверный формат копии или контрольная сумма');
    return db.transaction(async t => {
        const replica = await S.Replica.findByPk('primary', { transaction: t, lock: t.LOCK.UPDATE });
        if (replica.sourceId && replica.sourceId !== b.sourceId) throw ApiError.badRequest('Этот сервер уже связан с другой локальной базой');
        if (replica.version != null && BigInt(b.version) < BigInt(replica.version)) throw ApiError.badRequest('Эта копия старее уже полученной');
        if (replica.version != null && BigInt(b.version) === BigInt(replica.version)) {
            if (replica.checksum !== b.checksum) throw ApiError.badRequest('Версия совпадает, но данные отличаются');
        } else await replica.update({ sourceId: b.sourceId, version: String(b.version), payload: b.payload, checksum: b.checksum, receivedAt: new Date() }, { transaction: t });
        return { sourceId: b.sourceId, version: String(b.version), checksum: b.checksum, accepted: true };
    });
}
async function dashboard(user) {
    const replica = await S.Replica.findByPk('primary');
    if (!replica.payload) throw ApiError.badRequest('Локальный сервер ещё не отправил данные');
    const d = replica.payload;
    const sourceUser = d.users.find(u => u.email === user.email);
    if (!sourceUser || sourceUser.role !== user.role) throw ApiError.forbiddenRequest('Аккаунт не связан с локальной базой');
    if (d.Access?.find(a => a.userId === sourceUser.id)?.disabled) throw ApiError.forbiddenRequest('Доступ к аккаунту закрыт администратором');
    const products = d.products.filter(p => p.is_active).map(p => {
        if (user.role === 'employee') {const policy=(d.WorkPolicy||[]).filter(r=>r.userId===sourceUser.id&&r.startsOn<=require('./businessDay').today()).sort((a,b)=>b.startsOn.localeCompare(a.startsOn))[0],pack=(d.PackagingVariant||[]).find(v=>v.productId===p.id),rate=policy?.pieceRates?.find(r=>r.productId===p.id),piece=!policy||policy.mode==='piece',perKg=rate?Number(rate.rate)/(rate.unit==='pack'?Number(pack?.kgPerPack):1):pack?Number(pack.laborPerPack)/Number(pack.kgPerPack):Number(p.priceForEmployee);return {id:p.id,name:p.name,weight:p.weight,packKg:pack?.kgPerPack??null,wageMode:policy?.mode||'piece',payRateForKg:piece?perKg:null,payPerPack:piece&&pack?perKg*Number(pack.kgPerPack):null};}
        const s = d.Stock.find(s => s.productId === p.id);
        const card=(d.ProductDisplay||[]).find(c=>c.productId===p.id);
        const common = {packKg:(d.PackagingVariant||[]).find(v=>v.productId===p.id)?.kgPerPack??null,salePrice:(d.SellingPrice||[]).find(x=>x.productId===p.id)?.price??null, id: p.id, name: p.name, weight: p.weight, photo:card?.photo||'',description:card?.description||'',image:p.image||'',availableKg: Number(s?.kg || 0) - Number(s?.reservedKg || 0) };
        return user.role === 'representative' ? common : { ...common,wageRateLocked:d.Production.some(r=>r.productId===p.id&&['draft','posted'].includes(r.status)), packLaborPerPack:(d.PackagingVariant||[]).find(v=>v.productId===p.id)?.laborPerPack??null,kg: s?.kg, reservedKg: s?.reservedKg, priceForEmployee: p.priceForEmployee };
    });
    const own = row => user.role === 'super_admin' || row.userId === sourceUser.id;
    const base = { payrollPaymentInfo:(d.PayrollPaymentInfo||[]).filter(i=>user.role==='super_admin'||(d.Payment||[]).some(p=>p.id===i.paymentId&&p.workerId===sourceUser.id)),products, orders: d.Order.filter(own), sync: { mode: 'cloud', readOnly: true, receivedAt: replica.receivedAt } };
    const outlets=(d.Outlet||[]).filter(o=>o.active&&(user.role==='super_admin'||o.representativeId===sourceUser.id));
    const customers=(d.Customer||[]).filter(c=>user.role==='super_admin'||outlets.some(o=>o.customerId===c.id));
    if(user.role!=='employee')base.clientPrices=(d.ClientPrice||[]).filter(p=>user.role==='super_admin'||customers.some(c=>c.id===p.customerId)&&(!p.outletId||outlets.some(o=>o.id===p.outletId)));
    base.orders=base.orders.map(o=>({...o,destination:(d.Destination||[]).find(x=>x.orderId===o.id)||null}));
    if(user.role!=='employee')base.returns=(d.GoodsReturn||[]).filter(r=>user.role==='super_admin'||base.orders.some(o=>o.id===r.orderId)).map(r=>{const settlements=(d.ReturnSettlement||[]).filter(s=>s.returnId===r.id);return {...r,dispositions:(d.ReturnDisposition||[]).filter(a=>a.returnId===r.id),settlements:settlements.map(s=>({...s,reference:user.role==='super_admin'?s.reference:undefined,uses:(d.CreditUse||[]).filter(c=>c.settlementId===s.id).map(c=>({...c,reference:user.role==='super_admin'?c.reference:undefined}))})),events:(d.ReturnEvent||[]).filter(e=>e.returnId===r.id).map(e=>user.role==='super_admin'?e:{id:e.id,action:e.action,actorName:e.actorName,createdAt:e.createdAt})}});
    const staffWhere=r=>user.role==='super_admin'||r.userId===sourceUser.id;
    const ownRequests=(d.WageRequest||[]).filter(r=>staffWhere(r)&&(user.role!=='super_admin'||user.authority?.owner||user.authority?.permissions.payroll!==false||r.type==='late_production'));
    Object.assign(base,{workProfiles:(d.WorkProfile||[]).filter(staffWhere),workPolicies:(d.WorkPolicy||[]).filter(staffWhere),workDays:(d.WorkDay||[]).filter(staffWhere),wageAdjustments:(d.WageAdjustment||[]).filter(staffWhere),dailyPay:(d.DailyPay||[]).filter(staffWhere).map(r=>{if(user.role==='super_admin'||!r.snapshot)return r;const {source,...safe}=r.snapshot;return {...r,snapshot:safe};}),wageRequests:ownRequests,wageRequestEvents:(d.WageRequestEvent||[]).filter(e=>ownRequests.some(r=>r.id===e.requestId))});
    if (user.role === 'representative') return {...base,outlets,customers,payees:[{id:sourceUser.id,name:sourceUser.name,role:sourceUser.role}],payroll:d.payroll.filter(p=>p.is_active&&p.userId===sourceUser.id),payrollAdvances:d.advances.filter(a=>d.payroll.some(s=>s.id===a.salaryId&&s.userId===sourceUser.id&&s.is_active)),payments:d.Payment.filter(p=>p.workerId===sourceUser.id),repAccruals:(d.RepAccrual||[]).filter(p=>p.userId===sourceUser.id), company:d.Profile.find(p => p.userId === sourceUser.id)?.company || ''};
    Object.assign(base,{payees:d.users.filter(u=>['employee','representative'].includes(u.role)&&(user.role==='super_admin'||u.id===sourceUser.id)),repAccruals:(d.RepAccrual||[]).filter(a=>user.role==='super_admin'||a.userId===sourceUser.id)});
    Object.assign(base, { productions: d.Production.filter(p => user.role === 'super_admin' || p.workerId === sourceUser.id), payments: d.Payment.filter(p => user.role === 'super_admin' || p.workerId === sourceUser.id), payroll: d.payroll.filter(p => p.is_active && own(p)), workers: d.users.filter(u => u.role === 'employee' && (user.role === 'super_admin' || u.id === sourceUser.id)) });
    base.packagingRuns=(d.PackagingRun||[]).filter(r=>base.productions.some(p=>p.id===r.productionId));
    base.payrollAdvances = d.advances.filter(a => base.payroll.some(s => s.id === a.salaryId));
    if (user.role === 'employee') { base.productions = base.productions.map(p => Object.fromEntries(['id','productId','workerId','kg','date','status','laborCost','postedAt','createdAt'].map(k => [k,p[k]]))); return base; }
    const financeExtras=d.CashEntry?require('./tradeFinanceService').extras({orders:d.Order,destinations:d.Destination||[],customers:d.Customer||[],outlets:d.Outlet||[],receipts:d.ReceiptDocument||[],suppliers:d.Supplier||[],entries:d.CashEntry,allocations:d.CashAllocation||[],receiptFinance:d.ReceiptFinance||[],settlements:d.ReturnSettlement||[],credits:d.CreditUse||[],returns:d.GoodsReturn||[],debts:d.ClientDebt||[]}):{};
    return { ...base,...financeExtras,...require('./stockValueService').extras(d),receiptExpenseIds:(d.LegacyLink||[]).filter(l=>l.id.startsWith('receipt:')).map(l=>l.data.outcomeId).filter(Boolean),stockCounts:d.StockCount||[],receiptDrafts:d.ReceiptDraft||[],receiptCosts:d.ReceiptCosts||[],expenseReversals:d.ExpenseReversal||[],moneyPersonal:(d.MoneyDocument||[]).filter(r=>r.kind==='withdrawal'||r.reversalOf&&(d.MoneyDocument||[]).some(o=>o.id===r.reversalOf&&o.kind==='withdrawal')).map(r=>({id:r.id,date:r.date,amount:r.kind==='withdrawal'?Number(r.amount):-Number(r.amount),name:r.reason})),expenseArticles:d.ExpenseArticle||[],paymentAccounts:(d.MoneyAccount||[]).filter(a=>a.active).map(({id,name,method,defaultForMethod})=>({id,name,method,defaultForMethod})),expenseMeta:d.ExpenseMeta||[],expenseDecisions:d.ExpenseDecision||[],packagingVariants:d.PackagingVariant||[],outlets,customers, materials: d.Material.filter(m=>m.active!==false), archivedMaterials:d.Material.filter(m=>m.active===false), archivedProducts:d.products.filter(p=>!p.is_active), receipts: d.Receipt, recipes: d.Recipe.filter(r=>r.active!==false), archivedRecipes:d.Recipe.filter(r=>r.active===false), receiptDocuments: d.ReceiptDocument, users: d.users, incomes: d.incomes.map(i => ({ ...i, orderId:(d.LegacyLink||[]).find(l=>l.data?.incomeId===i.id&&l.id.startsWith('shipment:'))?.id.split(':')[1]||null, destination:(d.Destination||[]).find(x=>(d.LegacyLink||[]).some(l=>l.data?.incomeId===i.id&&l.id==='shipment:'+x.orderId+':'+i.productId))||null, product: d.products.find(p => p.id === i.productId), business_relation: d.relations.find(r => r.id === i.businessRelationId) })), outcomes: d.outcomes.map(o => ({ ...o, outcome_category: d.categories.find(c => c.id === o.outcomeCategoryId) })) };
}
async function tradeFinance(user){
 if(user.role!=='super_admin')throw ApiError.forbiddenRequest('Только администратор');
 await dashboard(user);
 const {payload:d}=await S.Replica.findByPk('primary');
 if(!d.CashEntry||!d.CashAllocation)throw ApiError.badRequest('Отправьте обновлённую копию с основного сервера');
 const result=require('./tradeFinanceService').summarize({orders:d.Order,destinations:d.Destination||[],customers:d.Customer||[],outlets:d.Outlet||[],receipts:d.ReceiptDocument||[],suppliers:d.Supplier||[],entries:d.CashEntry,allocations:d.CashAllocation,receiptFinance:d.ReceiptFinance||[],settlements:d.ReturnSettlement||[],credits:d.CreditUse||[],returns:d.GoodsReturn||[],debts:d.ClientDebt||[]});
 for(const c of result.clients)for(const o of c.documents){o.dueDate=(d.OrderTerms||[]).find(t=>t.orderId===o.id)?.dueDate||null;o.overdue=Boolean(o.dueDate&&o.dueDate<result.asOf&&o.due>.001);}
 return result;
}
function startAutomatic() {
    if (cloud() || process.env.SYNC_AUTO === 'false') return;
    const run = () => { if (process.env.SYNC_CLOUD_URL && process.env.SYNC_SHARED_KEY) sendAll({ role: 'super_admin' }).catch(() => {}); };
    const timer = setInterval(run, 30000); timer.unref(); run();
}
module.exports = { initialise, cloud, status, sendAll, receive, dashboard, tradeFinance, startAutomatic };
