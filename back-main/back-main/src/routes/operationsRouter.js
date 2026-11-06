const router = require('express').Router();
const service = require('../services/operationsService');
const auth = require('../middleware/authMiddleware');
const { User } = require('../models/models');
const ApiError = require('../exceptions/ApiError');
const tokenService = require('../services/tokenService');
const UserDto = require('../dtos/userDto');
const bcrypt = require('bcrypt');
const sessionCookie = require('../services/sessionCookie');
const idempotent = require('../services/idempotency');
const wrap = fn => async (req, res, next) => {
    try {
        if(req.params.id&&!/^(?:[1-9]\d{0,9}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(req.params.id))throw ApiError.badRequest('Некорректный номер записи');
        const mutation = req.user && !['GET','HEAD'].includes(req.method) && !['/preview','/sync/send'].includes(req.path)&&!req.path.endsWith('/corrections/preview');
        if (mutation && (req.path==='/client-bonuses'||/^\/receipts\/[^/]+\/corrections$/.test(req.path)) && !req.headers['x-operation-id']) throw ApiError.badRequest('Не удалось сохранить номер операции. Обновите форму и повторите');
        if (mutation) req.headers['x-operation-id'] ||= require('crypto').randomUUID();
        const action = async () => {
            const trail=require('../services/auditTrail'),before=mutation?await trail.snapshot(req):null;
            const result = await fn(req,res);
            if(mutation)await trail.record(req,before,result);
            if (mutation) await require('../models/operations').Audit.create({actorId:req.user.id,actorName:req.user.name,role:req.user.role,method:req.method,path:req.path,entityId:String(result?.id || ''),operationId:req.headers['x-operation-id']});
            return result;
        };
        res.json(await (mutation ? idempotent(req,action) : action()));
    } catch(e) { next(e); }
};
const attempts = new Map();
router.use('/account', (req,res,next)=>{
    const key='account:'+req.ip,now=Date.now();
    if(attempts.size>1000)for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
    let entry=attempts.get(key);if(!entry||entry.until<now)entry={count:0,until:now+60000};
    attempts.set(key,entry);if(++entry.count>8)return res.status(429).json({message:'Слишком много попыток. Попробуйте через минуту'});next();
});
router.post('/account/reset',wrap(req=>require('../services/accountLinkService').request(req.body)));
router.post('/account/complete',wrap(req=>require('../services/accountLinkService').complete(req.body)));
router.get('/account/status',wrap(()=>({configured:require('../services/accountLinkService').configured()})));
router.post('/session', wrap(async (req, res) => {
    if (process.env.LOCAL_DEMO !== 'true') throw ApiError.notFound();
    const key = req.ip, now = Date.now();
    if (attempts.size > 1000) for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    const a = attempts.get(key) || { count: 0, until: now + 60000 };
    if (a.until < now) { a.count = 0; a.until = now + 60000; }
    if (++a.count > 20) throw new ApiError(429, 'Слишком много попыток. Подождите минуту');
    attempts.set(key, a);
    const u = await User.findOne({ where: { email: String(req.body.email || '').toLowerCase() } });
    if (!u || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password, u.password)) throw ApiError.unauthorizedRequest('Неверный email или пароль');
    if ((await require('../models/operations').Access.findByPk(u.id))?.disabled) throw ApiError.forbiddenRequest('Доступ к аккаунту закрыт администратором');
    const tokens = tokenService.generateToken({ ...new UserDto(u) });
    await tokenService.saveToken(u.id, tokens.refreshToken);
    res.cookie(sessionCookie.name, tokens.refreshToken, { ...sessionCookie.options, maxAge: sessionCookie.maxAge });
    return { user: {...new UserDto(u),authority:await require('../services/authorityService').access(u)}, accessToken: tokens.accessToken };
}));
router.use(auth(), async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { email: req.user.email }, attributes: ['id', 'name', 'email', 'role'] });
        if (!user || !['super_admin', 'employee', 'representative'].includes(user.role)) throw ApiError.forbiddenRequest();
        req.user = user.get({ plain: true });
        const authority=require('../services/authorityService');
        req.user.authority=process.env.SYNC_ROLE==='cloud'?await authority.cloudAccess(req.user):await authority.access(req.user);
        await authority.authorize(req);
        next();
    } catch (e) { next(e); }
});
router.get('/me', wrap(req => req.user));
// One-use owner handover deliberately runs outside the operational idempotency transaction.
router.post('/client-handover',async(req,res,next)=>{try{res.json(await require('../services/clientHandoverService').clean(req.user,req.body));}catch(e){next(e);}});
router.get('/client-handover-backup',wrap(req=>require('../services/clientHandoverService').backup(req.user)));
router.get('/account-email-status',wrap(async req=>{await require('../services/authorityService').owner(req.user);return {configured:require('../services/accountLinkService').configured()};}));
router.post('/account-email-test',wrap(async req=>{
    await require('../services/authorityService').owner(req.user);
    if(!require('../services/accountLinkService').configured())throw new ApiError(503,'Отправка писем пока не настроена');
    try{return await require('../services/mailService/mailService').sendTestMail();}
    catch(error){throw new ApiError(503,error.code==='EAUTH'
        ? 'Gmail отклонил пароль приложения. Создайте новый пароль приложения для выбранного почтового аккаунта и обновите SMTP_PASSWORD'
        : 'Не удалось отправить письмо: '+({ETIMEDOUT:'почтовый сервер не ответил вовремя',ECONNECTION:'нет соединения с почтовым сервером',ESOCKET:'ошибка защищённого соединения',EENVELOPE:'почтовый адрес отклонён'}[error.code]||'почтовый сервер не принял письмо'));}
}));
router.post('/staff-invitations',wrap(req=>require('../services/accountLinkService').invite(req.user,req.body)));
router.get('/staff-contacts/:id',wrap(req=>require('../services/staffContactService').read(req.user,req.params.id)));
router.patch('/staff-contacts/:id',wrap(req=>require('../services/staffContactService').save(req.user,req.params.id,req.body)));
const telegram = require('../services/telegramService');
router.get('/telegram/status', wrap(req => telegram.status(req.user)));
router.get('/audit', wrap(req => service.audit(req.user)));
const sync = require('../services/syncService');
router.get('/sync/status', wrap(req => sync.status(req.user)));
router.post('/sync/send', wrap(req => sync.sendAll(req.user)));
router.get('/dashboard', wrap(async req => {
    const raw=await (sync.cloud() ? sync.dashboard(req.user) : service.dashboard(req.user));
    if(req.user.role==='super_admin')raw.payrollUnallocated=require('../services/payrollCoverage')(raw);
    const data=req.user.role==='super_admin'?require('../services/authorityService').project(raw,req.user.authority):raw;
    if(process.env.PUBLIC_DEMO==='true'){return {...data,publicDemo:true,presentationDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())};}
    if (process.env.PRESENTATION_MODE==='true') { const plan=await require('../models/sync').State.findByPk('presentation-ready'); return {...data,presentation:true,presentationDate:plan?.value.date || null}; }
    return data;
}));
router.use((req, res, next) => {
    if (sync.cloud() && !['GET', 'HEAD'].includes(req.method)) return res.status(409).json({message: 'Это облачная копия. Изменения вносите на локальном сервере, затем отправьте обновление.'});
    next();
});
const financialWrite=fn=>(req,res,next)=>{if(!req.headers['x-operation-id'])return next(ApiError.badRequest('Для денежной операции нужен постоянный номер подтверждения'));return wrap(fn)(req,res,next);};
const finance=require('../services/tradeFinanceService');
router.get('/expense-articles',wrap(req=>require('../services/expenseArticleService').list(req.user)));
router.post('/expense-articles',wrap(req=>require('../services/expenseArticleService').save(req.user,null,req.body)));
router.patch('/expense-articles/:id',wrap(req=>require('../services/expenseArticleService').save(req.user,req.params.id,req.body)));
router.get('/native-import',wrap(async req=>{await require('../services/authorityService').owner(req.user);const row=await require('../models/sync').State.findByPk(require('../services/workbookNativeImport').marker);return row?.value||null;}));

router.get('/money',wrap(req=>require('../services/moneyService').read(req.user)));
router.post('/money-accounts',wrap(req=>require('../services/moneyService').saveAccount(req.user,null,req.body)));
router.patch('/money-accounts/:id',wrap(req=>require('../services/moneyService').saveAccount(req.user,req.params.id,req.body)));
router.post('/money-documents',financialWrite(req=>require('../services/moneyService').document(req.user,req.body)));
router.post('/money-documents/:id/reverse',financialWrite(req=>require('../services/moneyService').reverse(req.user,req.params.id,req.body)));
router.post('/money-links',financialWrite(req=>require('../services/moneyService').reassign(req.user,req.body)));

router.get('/authority',wrap(req=>require('../services/authorityService').list(req.user)));
router.post('/authority',wrap(req=>require('../services/authorityService').create(req.user,req.body)));
router.patch('/authority/:id',wrap(req=>require('../services/authorityService').set(req.user,req.params.id,req.body)));
router.get('/trade-finance',wrap(req=>sync.cloud()?sync.tradeFinance(req.user):finance.visible(req.user)));
router.get('/client-prices',wrap(async req=>{if(req.user.role!=='super_admin')throw ApiError.forbiddenRequest();return sync.cloud()?(await sync.dashboard(req.user)).clientPrices||[]:finance.prices(req.user);}));
router.post('/client-prices',wrap(req=>finance.price(req.user,req.body)));
router.post('/suppliers',wrap(req=>finance.supplier(req.user,req.body)));
const supplierPrices=require('../services/supplierPriceService');
const clientBonuses=require('../services/clientBonusService');
router.get('/client-bonuses',wrap(req=>clientBonuses.list(req.user,req.query.customerId)));
router.post('/client-bonuses',wrap(req=>clientBonuses.save(req.user,req.body)));
router.get('/supplier-prices',wrap(req=>supplierPrices.list(req.user,req.query.supplierId)));
router.post('/supplier-prices',wrap(req=>supplierPrices.save(req.user,req.body)));
router.delete('/supplier-prices/:id',wrap(req=>supplierPrices.remove(req.user,req.params.id)));
router.post('/client-opening/:id/cancel',financialWrite(req=>finance.cancelOpening(req.user,req.params.id,req.body)));
router.post('/client-opening',financialWrite(req=>finance.opening(req.user,req.body)));
router.post('/cash',financialWrite(req=>finance.payment(req.user,req.body)));
router.post('/cash/:id/allocate',financialWrite(req=>finance.allocate(req.user,req.params.id,req.body)));
router.post('/cash/:id/reverse',financialWrite(req=>finance.reverse(req.user,req.params.id,req.body)));
router.patch('/orders/:id/terms',wrap(req=>finance.terms(req.user,req.params.id,req.body)));
router.patch('/suppliers/:id',wrap(req=>finance.editSupplier(req.user,req.params.id,req.body)));
const returns=require('../services/returnsService');
router.post('/telegram/test', wrap(req => telegram.test(req.user)));
router.post('/telegram/retry', wrap(req => telegram.retry(req.user)));
router.post('/returns',wrap(req=>returns.create(req.user,req.body)));
router.post('/returns/:id/cancel',wrap(req=>returns.cancel(req.user,req.params.id,req.body)));
router.post('/returns/:id/post',wrap(req=>returns.post(req.user,req.params.id,req.body)));
router.post('/returns/:id/resolve',wrap(req=>returns.resolve(req.user,req.params.id,req.body)));
router.post('/returns/:id/settle',wrap(req=>returns.settle(req.user,req.params.id,req.body)));
router.post('/return-credits/:id/apply',wrap(req=>returns.applyCredit(req.user,req.params.id,req.body)));
router.get('/reconciliation', wrap(req => {
    if (sync.cloud()) throw ApiError.badRequest('Сверка выполняется на основном сервере');
    return require('../services/reconciliationService')(req.user);
}));
const trade=require('../services/tradeService');
router.post('/outlets',wrap(req=>trade.outlet(req.user,req.body)));
router.get('/outlets/:id/catalog-link',wrap(req=>require('../services/storeCatalogService').status(req.user,req.params.id)));
router.post('/outlets/:id/catalog-link',async(req,res,next)=>{try{if(!req.headers['x-operation-id'])throw ApiError.badRequest('Не удалось сохранить номер операции');res.json(await require('../services/storeCatalogService').issue(req.user,req.params.id,req.headers['x-operation-id']));}catch(e){next(e);}});
router.post('/outlets/:id/catalog-link/revoke',wrap(req=>require('../services/storeCatalogService').revoke(req.user,req.params.id)));
router.patch('/outlets/:id',wrap(req=>trade.assign(req.user,req.params.id,req.body)));
router.patch('/outlets/:id/details',wrap(req=>trade.editOutlet(req.user,req.params.id,req.body)));
router.patch('/customers/:id',wrap(req=>trade.editCustomer(req.user,req.params.id,req.body)));
router.patch('/products/:id/display',wrap(async req=>{const c=await trade.display(req.user,req.params.id,req.body);return {productId:c.productId,photoVersion:c.photoVersion,hasPhoto:Boolean(c.photo),description:c.description,catalogGroup:c.catalogGroup,catalogVisible:c.catalogVisible,sortOrder:c.sortOrder};}));
router.get('/products/:id/photo',async(req,res,next)=>{try{const media=await require('../services/productDisplayService').media(req.params.id,req.query.size);res.type(media.type).send(media.bytes);}catch(e){next(e);}});
router.post('/materials', wrap(req => service.material(req.user, req.body)));
router.post('/packaging/boxes',wrap(req=>require('../services/boxRuleService').save(req.user,null,req.body)));
router.patch('/packaging/boxes/:id',wrap(req=>require('../services/boxRuleService').save(req.user,req.params.id,req.body)));
router.post('/receipts/:id/corrections/preview',wrap(req=>require('../services/receiptCorrectionService').preview(req.user,req.params.id,req.body)));
router.post('/receipts/:id/corrections',wrap(req=>require('../services/receiptCorrectionService').post(req.user,req.params.id,req.body)));
router.post('/receipts', wrap(req => service.receipt(req.user, req.body)));
router.post('/receipt-drafts',wrap(req=>require('../services/receiptDraftService').create(req.user,req.body)));
router.patch('/receipt-drafts/:id',wrap(req=>require('../services/receiptDraftService').update(req.user,req.params.id,req.body)));
router.post('/receipt-drafts/:id/post',wrap(req=>require('../services/receiptDraftService').post(req.user,req.params.id,req.body)));
router.get('/stock-reallocations/:id',wrap(req=>require('../services/stockReallocationService').read(req.user,req.params.id)));
router.post('/stock-reallocations/:id',financialWrite(req=>require('../services/stockReallocationService').post(req.user,req.params.id,req.body)));
router.post('/stock-counts',wrap(req=>require('../services/stockCountService').create(req.user,req.body)));
router.patch('/stock-counts/:id',wrap(req=>require('../services/stockCountService').draft(req.user,req.params.id,req.body)));
router.post('/stock-counts/:id/accept',financialWrite(req=>require('../services/stockCountService').accept(req.user,req.params.id,req.body)));
router.post('/stock-counts/:id/post',wrap(req=>require('../services/stockCountService').post(req.user,req.params.id,req.body)));
router.post('/receipts/:id/pay', wrap(req => service.payReceipt(req.user, req.params.id, req.body)));
router.post('/expenses', wrap(req => service.expense(req.user, req.body)));
router.patch('/expenses/:id/classification',wrap(req=>require('../services/expenseService').classify(req.user,req.params.id,req.body)));
router.post('/expenses/:id/reverse',wrap(req=>require('../services/expenseService').reverse(req.user,req.params.id,req.body)));
router.post('/products', wrap(req => service.product(req.user, req.body)));
router.post('/product-packs', wrap(req => service.createPack(req.user, req.body)));
router.post('/products/packs/ensure-all', wrap(req => service.ensureAllBasePacks(req.user)));
router.post('/products/:id/packs/ensure', wrap(req => service.ensureBasePacks(req.user, req.params.id)));
router.patch('/product-packs/:id', wrap(req => service.updatePack(req.user, req.params.id, req.body)));
router.delete('/product-packs/:id', wrap(req => service.deletePack(req.user, req.params.id)));
router.post('/packaging/variants',wrap(req=>require('../services/packagingService').create(req.user,req.body)));
router.post('/recipes', wrap(req => service.recipe(req.user, req.body)));
router.post('/preview', wrap(req => service.preview(req.user, req.body)));
router.post('/productions',wrap(async req=>{const D=require('../services/businessDay');if(req.user.role==='employee'&&req.body.date<D.today()){const r=await require('../services/wageRequestService').create(req.user,{type:'late_production',date:req.body.date,reason:req.body.reason||'Запись получена после дня выпуска. Требуется проверка администратора.',payload:req.body});return {...r.toJSON(),kind:'late_request'};}return service.production(req.user,req.body);}));
router.post('/productions/:id/post', wrap(req => service.postProduction(req.user, req.params.id, req.body)));
router.post('/productions/:id/cancel', wrap(req => service.cancelProduction(req.user, req.params.id)));
router.post('/orders', wrap(req => service.order(req.user, req.body)));
router.patch('/orders/:id', wrap(req => service.orderStatus(req.user, req.params.id, req.body)));
router.post('/users', wrap(req => service.user(req.user, req.body)));
router.patch('/users/:id/access', wrap(req => service.access(req.user, req.params.id, req.body)));
router.patch('/users/:id', wrap(req => service.updateUser(req.user, req.params.id, req.body)));
router.post('/act-number', wrap(req => service.actNumber(req.user, req.body)));
router.patch('/users/:id/password', wrap(req => service.changePassword(req.user, req.params.id, req.body)));
const repPayroll=require('../services/representativePayrollService');
router.post('/representative-payroll/preview',wrap(req=>repPayroll.preview(req.user,req.body)));
router.post('/representative-payroll/post',wrap(req=>{if(!req.body.requestId)throw ApiError.badRequest('Изменение зарплаты отправляется сотруднику на согласование');return require('../services/wageRequestService').post(req.user,req.body.requestId,req.body);}));
router.post('/payments', wrap(req => service.payment(req.user, req.body)));
router.post('/advances', wrap(req => service.advance(req.user, req.body)));
const workRequests=require('../services/wageRequestService'),dailyPay=require('../services/dailyPayService');
router.get('/wage-requests',wrap(async req=>{if(sync.cloud()){const data=await sync.dashboard(req.user);return {wageRequests:data.wageRequests||[],wageRequestEvents:data.wageRequestEvents||[]};}return workRequests.visible(req.user);}));
router.post('/wage-requests',wrap(req=>workRequests.create(req.user,req.body)));
router.post('/wage-requests/:id/reply',wrap(req=>workRequests.reply(req.user,req.params.id,req.body)));
router.post('/wage-requests/:id/propose',wrap(req=>workRequests.propose(req.user,req.params.id,req.body)));
router.post('/wage-requests/:id/post',wrap(req=>workRequests.post(req.user,req.params.id,req.body)));
router.post('/wage-requests/:id/reject',wrap(req=>workRequests.reject(req.user,req.params.id,req.body)));
router.post('/work-days',wrap(req=>dailyPay.workDay(req.user,req.body)));
router.patch('/work-profiles/:id',wrap(req=>dailyPay.profile(req.user,req.params.id,req.body)));
router.post('/work-recalculate',wrap(req=>{if(req.user.role!=='super_admin')throw ApiError.forbiddenRequest();return require('../database/sequelize').transaction(async t=>{await workRequests.rights(req.user,'policy',t);await dailyPay.recomputeRange(Number(req.body.userId),require('../services/businessDay').date(req.body.from),require('../services/businessDay').date(req.body.to),req.user,t);return {ok:true};});}));
router.get('/exchange', wrap(async (req, res) => {
    if (sync.cloud()) throw ApiError.badRequest('Выгрузка в 1С выполняется на основном сервере');
    res.setHeader('Content-Disposition', 'attachment; filename="cond-exchange.json"');
    return service.exchange(req.user);
}));

router.patch('/products/:id', wrap(req => require('../services/catalogAdminService').product(req.user,req.params.id,req.body)));
router.patch('/recipes/:id', wrap(req => require('../services/catalogAdminService').recipe(req.user,req.params.id,req.body)));
router.patch('/materials/:id', wrap(req => require('../services/catalogAdminService').material(req.user,req.params.id,req.body)));

module.exports = router;
