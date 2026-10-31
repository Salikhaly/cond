require('dotenv').config();
// Read-only setup helper. Does not acknowledge updates or replace an existing webhook.
async function main() {
    const token=process.env.TELEGRAM_BOT_TOKEN;
    if(!token)throw Error('Добавьте TELEGRAM_BOT_TOKEN в серверный .env');
    const call=async(method,body={})=>{
        let r,d;
        try{r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});d=await r.json();}
        catch{throw Error('Telegram недоступен. Проверьте соединение.');}
        if(!d.ok)throw Error('Telegram не выполнил '+method+' (код '+(d.error_code||r.status)+'). Проверьте токен и подключение.');
        return d.result;
    };
    const me=await call('getMe');console.log('Бот: @'+me.username);
    const webhook=await call('getWebhookInfo');
    if(webhook.url){console.log('У бота уже есть webhook. Используйте отдельного бота для COND; действующий webhook не изменён.');return;}
    const updates=await call('getUpdates',{limit:100,timeout:0});
    const groups=new Map();
    for(const u of updates){const chat=(u.message||u.my_chat_member)?.chat;if(['group','supergroup'].includes(chat?.type))groups.set(chat.id,chat.title);}
    for(const [id,title]of groups)console.log('Группа: '+title+' → TELEGRAM_GROUP_ID='+id);
    if(!groups.size)console.log('Добавьте бота в группу и отправьте /start@'+me.username+', затем запустите команду снова.');
    if(process.env.TELEGRAM_GROUP_ID){const chat=await call('getChat',{chat_id:process.env.TELEGRAM_GROUP_ID});if(!['group','supergroup'].includes(chat.type))throw Error('Нужна группа с Нурланом и администратором');console.log('Настроенная группа доступна: '+chat.title);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
