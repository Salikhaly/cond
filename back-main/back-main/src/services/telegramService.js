const { Op } = require('sequelize');
const db = require('../database/sequelize');
const { TelegramMessage: Message } = require('../models/notifications');
const { Order, Production } = require('../models/operations');
const ApiError = require('../exceptions/ApiError');
const admin = user => { if (user?.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор'); };
const number = n => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
const short = id => id.slice(0, 8).toUpperCase();
const clip = s => String(s || '').slice(0, 250);

function config() {
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = process.env.TELEGRAM_GROUP_ID || '';
    let appUrl = '';
    try {
        const u = new URL(process.env.TELEGRAM_APP_URL || process.env.CLIENT_URL);
        if (u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash) appUrl = u.origin;
    } catch {}
    const hours = [...new Set((process.env.TELEGRAM_REMINDER_HOURS || '9,17').split(',').map(s => s.trim()).filter(Boolean).map(Number))];
    const validHours = hours.length && hours.every(n => Number.isInteger(n) && n >= 0 && n <= 23);
    const allowed = (process.env.PUBLIC_DEMO !== 'true' || process.env.TELEGRAM_ALLOW_PUBLIC_DEMO==='true') && process.env.SYNC_ROLE !== 'cloud';
    return {
        enabled: process.env.TELEGRAM_ENABLED === 'true' && allowed,
        ready: /^\d+:[A-Za-z0-9_-]{20,}$/.test(token) && /^-\d+$/.test(chatId) && (!process.env.TELEGRAM_APP_URL || Boolean(appUrl)) && Boolean(validHours),
        token, chatId, appUrl, hours: validHours ? hours.sort((a,b) => a-b) : [9,17],
        blocked: !allowed
    };
}

async function enqueue(type, entityId, text, section, transaction, key) {
    const c = config();
    if (!c.enabled || !c.ready) return;
    await Message.findOrCreate({
        where: { key: key || type + ':' + entityId },
        defaults: { type, entityId, text: (process.env.PUBLIC_DEMO==='true'?'🧪 Демо COND\n':'')+text.slice(0, 3750), section, chatId: c.chatId }, transaction
    });
}

async function orderCreated(o, destination, actor, transaction) {
    const lines = o.lines.slice(0, 15).map(l => '• ' + clip(l.name) + ' — ' + number(l.kg) + ' кг');
    if (o.lines.length > 15) lines.push('Ещё товаров: ' + (o.lines.length - 15));
    return enqueue('order', o.id,
        ['🛒 Новая заявка № ' + short(o.id), clip(destination?.outlet.name || o.company),
         'Представитель: ' + clip(actor.name), 'На поставку: ' + o.deliveryDate, ...lines,
         'Всего: ' + number(o.lines.reduce((s,l) => s + Number(l.kg), 0)) + ' кг',
         'Ждёт согласования администратора.'].join('\n'), 'orders', transaction);
}
async function productionCreated(p, product, worker, transaction) {
    return enqueue('production', p.id,
        ['🏭 Акт переработки / выпуска № ' + short(p.id), 'Сотрудник: ' + clip(worker.name),
         clip(product.name) + ' — ' + number(p.kg) + ' кг', 'Дата выпуска: ' + p.date,
         'Ждёт проверки администратора. Сырьё и зарплата пока не проведены.'].join('\n'), 'production', transaction);
}

function localTime(now) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Qyzylorda', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'
    }).formatToParts(now).map(p => [p.type, p.value]));
    return { date: parts.year + '-' + parts.month + '-' + parts.day, hour: Number(parts.hour) };
}
async function reminders(now = new Date()) {
    const c = config();
    if (!c.enabled || !c.ready) return;
    const {date, hour} = localTime(now);
    // Only the current configured hour; do not replay yesterday's reminders after downtime.
    if (!c.hours.includes(hour)) return;
    const [orders, productions] = await Promise.all([
        Order.count({where:{status:'submitted'}}), Production.count({where:{status:'draft'}})
    ]);
    if (!orders && !productions) return;
    return enqueue('reminder', null, ['⏰ Нужно проверить',
        'Новые заявки: ' + orders, 'Акты сотрудников: ' + productions,
        'Подтвердите или отклоните документы в приложении.'].join('\n'), 'overview', undefined,
        'reminder:' + c.chatId + ':' + date + ':' + hour);
}

async function send(row, c, transport) {
    let response;
    try {
        const target = c.appUrl ? new URL(c.appUrl) : null;
        target?.searchParams.set('section', row.section || 'overview');
        if (row.entityId) target?.searchParams.set('document', row.entityId);
        response = await transport('https://api.telegram.org/bot' + c.token + '/sendMessage', {
            method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(10000),
            body:JSON.stringify({chat_id:row.chatId, text:row.text,
                reply_markup:target?{inline_keyboard:[[{text:'Открыть в COND',url:target.href}]]}:undefined,
                link_preview_options:{is_disabled:true}})
        });
        const body = await response.json();
        if (response.ok && body.ok && body.result?.message_id) return {messageId:String(body.result.message_id)};
        const code = body.error_code || response.status;
        return {error: code === 403 ? 'Бот удалён из группы или лишён доступа' : code === 400 ? 'Проверьте ID группы и доступ бота' : 'Telegram временно недоступен',
            permanent:[400,401,403,404].includes(code), retryAfter:Math.min(86400,Math.max(0,Number(body.parameters?.retry_after) || 0))};
    } catch {
        // Never log fetch errors: they can contain the URL with the bot token.
        return {error:'Нет ответа от Telegram. Отправка будет повторена'};
    }
}

async function deliver({now = new Date(), transport = fetch, limit = 10} = {}) {
    const c = config();
    if (!c.enabled || !c.ready) return {sent:0, disabled:true};
    let sent = 0;
    for (let i=0; i<Math.min(limit, 10); i++) {
        const handled = await db.transaction(async transaction => {
            const row = await Message.findOne({where:{status:'pending',chatId:c.chatId,nextAttemptAt:{[Op.lte]:now}},
                order:[['createdAt','ASC']], transaction, lock:transaction.LOCK.UPDATE, skipLocked:true});
            if (!row) return false;
            // Suppress notifications that are already obsolete when connectivity resumes.
            const entity = row.type === 'order' ? await Order.findByPk(row.entityId,{transaction}) :
                row.type === 'production' ? await Production.findByPk(row.entityId,{transaction}) : null;
            if (['order','production'].includes(row.type) && (!entity || entity.status !== (row.type === 'order' ? 'submitted' : 'draft'))) {
                await row.update({status:'obsolete'}, {transaction}); return true;
            }
            if (row.type === 'reminder') {
                const time = localTime(now);
                if (row.key !== 'reminder:' + c.chatId + ':' + time.date + ':' + time.hour) {
                    await row.update({status:'obsolete'}, {transaction}); return true;
                }
                const [orders, productions] = await Promise.all([Order.count({where:{status:'submitted'},transaction}),Production.count({where:{status:'draft'},transaction})]);
                if (!orders && !productions) {await row.update({status:'obsolete'},{transaction});return true;}
                row.text = (process.env.PUBLIC_DEMO==='true'?'🧪 Демо COND\n':'')+'⏰ Нужно проверить\nНовые заявки: ' + orders + '\nАкты сотрудников: ' + productions + '\nПодтвердите или отклоните документы в приложении.';
            }
            const result = await send(row, c, transport), attempts = row.attempts + 1;
            if (result.messageId) {
                await row.update({status:'sent',attempts,sentAt:now,messageId:result.messageId,lastError:null},{transaction}); sent++;
            } else {
                const seconds = Math.max(result.retryAfter || 0, Math.min(3600, 30 * 2 ** Math.min(attempts-1,7)));
                await row.update({attempts,status:result.permanent || attempts >= 8 ? 'failed' : 'pending',lastError:result.error,
                    nextAttemptAt:new Date(now.getTime()+seconds*1000)},{transaction});
            }
            return true;
        });
        if (!handled) break;
    }
    return {sent};
}
let ticking, timer;
async function tick(options) {
    if (ticking) return ticking;
    ticking = (async()=>{await reminders(options?.now);return deliver(options);})();
    try {return await ticking;} finally {ticking = null;}
}
function start() {
    if (!config().enabled || !config().ready || timer) return;
    const work = () => tick().catch(()=>console.error('Telegram: не удалось обработать очередь уведомлений'));
    work(); timer = setInterval(work, 30000); timer.unref();
}
function stop() {clearInterval(timer);timer=null;return ticking;}
async function status(user) {
    admin(user); const c = config();
    if (c.blocked) return {enabled:false,ready:false,blocked:true,hours:c.hours,timeZone:'Asia/Qyzylorda'};
    const counts = await Message.count({attributes:['status'],group:['status']});
    const latest = await Message.findOne({where:{status:'sent'},order:[['sentAt','DESC']],attributes:['sentAt']});
    const failed = await Message.findOne({where:{status:'failed'},order:[['updatedAt','DESC']],attributes:['lastError']});
    return {demo:process.env.PUBLIC_DEMO==='true',serverless:Boolean(process.env.VERCEL),hasAppLink:Boolean(c.appUrl),enabled:c.enabled,ready:c.ready,hours:c.hours,timeZone:'Asia/Qyzylorda',
        pending:Number(counts.find(r=>r.status==='pending')?.count||0),failed:Number(counts.find(r=>r.status==='failed')?.count||0),
        lastSentAt:latest?.sentAt||null,lastError:failed?.lastError||null};
}
async function test(user) {
    admin(user); const c = config();
    if (!c.enabled || !c.ready) throw ApiError.badRequest('Сначала настройте токен бота, ID группы и HTTPS-адрес на сервере');
    const bucket = Math.floor(Date.now()/60000);
    await enqueue('test',null,'✅ COND подключён. В эту группу будут приходить новые заявки и акты сотрудников.','overview',undefined,'test:'+c.chatId+':'+bucket);
    return {queued:true};
}
async function retry(user) {
    admin(user); const c = config();
    if (!c.enabled || !c.ready) throw ApiError.badRequest('Telegram пока не подключён');
    await Message.update({status:'pending',attempts:0,nextAttemptAt:new Date(),lastError:null},{where:{status:'failed',chatId:c.chatId}});
    return {queued:true};
}
module.exports = {config,orderCreated,productionCreated,reminders,deliver,tick,start,stop,status,test,retry,localTime};
