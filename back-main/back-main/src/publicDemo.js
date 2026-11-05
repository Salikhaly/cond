const {Client}=require('pg');
const db=require('./database/sequelize');
require('./models/models');require('./models/operations');require('./models/sync');
const {State}=require('./models/sync');
const app=require('./app');
let ready;
function validate(){
 if(process.env.PUBLIC_DEMO!=='true'||process.env.LOCAL_DEMO!=='true')throw Error('Public demo deployment requires explicit demo flags');
 if(!process.env.SECRET_KEY||process.env.SECRET_KEY.length<48)throw Error('A separate signing key is required');
 if(process.env.SYNC_CLOUD_URL||process.env.SYNC_ROLE==='cloud')throw Error('Public demo cannot connect to a working instance');
 if(process.env.ALLOW_LOCAL_PUBLIC_DEMO_TEST==='true'&&!process.env.VERCEL)return;
 const url=new URL(process.env.DATABASE_URL||'');
 if(!url.hostname.endsWith('.neon.tech')||process.env.COND_DEMO_RESOURCE!=='cond-demo-db')throw Error('A dedicated Neon demo database is required');
 if(new URL(process.env.CLIENT_URL||'').protocol!=='https:')throw Error('Public demo requires HTTPS');
}
async function bootstrap(){
 validate();await db.authenticate();
 const [schema]=await db.query("SELECT to_regclass('public.products') AS products, COALESCE(to_regclass('public.selling_prices'),to_regclass('public.selling_price')) AS prices, to_regclass('public.receipt_documents') AS receipts");
 if(schema[0].products&&schema[0].prices){await require('./services/workbookPriceCorrections').apply();}
 const [tables]=await db.query("SELECT to_regclass('public.sync_states') AS name");
 if(tables[0].name&&await State.findByPk('public-demo-ready:v1')&&await State.findByPk('schema:returns:v1')&&await State.findByPk('schema:payroll-sales:v1')&&await State.findByPk('schema:trade-finance:v1')&&await State.findByPk('schema:stock-value:v1')&&await State.findByPk('schema:packaging:v1')&&await State.findByPk('schema:expenses:v1')&&await State.findByPk('schema:stock-counts:v1')&&await State.findByPk('schema:receipt-drafts:v1')&&await State.findByPk('schema:authority:v1')&&await State.findByPk('schema:daily-pay:v1')&&await State.findByPk('schema:cost-groups:v1')&&await State.findByPk('schema:mobile-money:v1')&&await State.findByPk('schema:receipt-packs-advances:v1')&&await State.findByPk(require('./services/packCatalogService').marker)&&await State.findByPk(require('./services/packCatalogService').baseMarker)&&await State.findByPk('schema:supplier-prices:v1')&&await State.findByPk('schema:client-bonuses:v1')&&await State.findByPk('schema:advance-schedule:v1')&&await State.findByPk('schema:parents:v1')&&await State.findByPk('schema:act-register:v1')&&await State.findByPk('schema:staff-tasks-account-links:v1')&&await State.findByPk('schema:receipt-corrections-shared-box:v1')&&await State.findByPk('schema:material-cost-quality:v1'))return;
 const lock=new Client(process.env.ALLOW_LOCAL_PUBLIC_DEMO_TEST==='true'&&!process.env.VERCEL?{host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}:{connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}});
 await lock.connect();
 try{
  await lock.query('SELECT pg_advisory_lock(42810277)');
  const check=await lock.query("SELECT to_regclass('public.sync_states') AS name");
  if(check.rows[0].name&&await State.findByPk('public-demo-ready:v1')&&await State.findByPk('schema:returns:v1')&&await State.findByPk('schema:payroll-sales:v1')&&await State.findByPk('schema:trade-finance:v1')&&await State.findByPk('schema:stock-value:v1')&&await State.findByPk('schema:packaging:v1')&&await State.findByPk('schema:expenses:v1')&&await State.findByPk('schema:stock-counts:v1')&&await State.findByPk('schema:receipt-drafts:v1')&&await State.findByPk('schema:authority:v1')&&await State.findByPk('schema:daily-pay:v1')&&await State.findByPk('schema:cost-groups:v1')&&await State.findByPk('schema:mobile-money:v1')&&await State.findByPk('schema:receipt-packs-advances:v1')&&await State.findByPk(require('./services/packCatalogService').marker)&&await State.findByPk(require('./services/packCatalogService').baseMarker)&&await State.findByPk('schema:supplier-prices:v1')&&await State.findByPk('schema:client-bonuses:v1')&&await State.findByPk('schema:advance-schedule:v1')&&await State.findByPk('schema:parents:v1')&&await State.findByPk('schema:act-register:v1')&&await State.findByPk('schema:staff-tasks-account-links:v1')&&await State.findByPk('schema:receipt-corrections-shared-box:v1')&&await State.findByPk('schema:material-cost-quality:v1'))return;
  await db.sync();await require('./database/upgradeOperations')();
  if(!await State.findByPk('public-demo-ready:v1'))await require('./database/seedPublicDemo')();
  await require('./database/seedDemoPrices')();
  await require('./services/packCatalogService').ensure();
  await require('./services/packCatalogService').ensureBasePacks();
  await State.findOrCreate({where:{key:'schema:supplier-prices:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:client-bonuses:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:advance-schedule:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:parents:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:act-register:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:staff-tasks-account-links:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:material-cost-quality:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:receipt-corrections-shared-box:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:mobile-money:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:receipt-packs-advances:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:daily-pay:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:cost-groups:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:authority:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:receipt-drafts:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:stock-counts:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:expenses:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:packaging:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:stock-value:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:trade-finance:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:payroll-sales:v1'},defaults:{value:{version:1}}});
  await State.findOrCreate({where:{key:'schema:returns:v1'},defaults:{value:{version:1}}});
 }finally{await lock.query('SELECT pg_advisory_unlock(42810277)');await lock.end();}
}
module.exports=async(req,res)=>{
 const pathname=new URL(req.url,'https://demo.invalid').pathname;
 if(pathname.startsWith('/api/sync')||pathname.startsWith('/api/auth/')&&!['/api/auth/refresh','/api/auth/logout'].includes(pathname)){res.statusCode=404;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'В демоверсии используйте вход по выбранной роли'}));return;}
 try{if(!ready)ready=bootstrap().catch(e=>{ready=null;throw e});await ready;
 const telegram=require('./services/telegramService');
 if(pathname.startsWith('/api/telegram/cron/')){
  const expected=process.env.CRON_SECRET;
  const supplied=req.headers.authorization||'';
  const hash=v=>require('crypto').createHash('sha256').update(v).digest();
  if(!expected||!require('crypto').timingSafeEqual(hash(supplied),hash('Bearer '+expected))){res.statusCode=401;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Unauthorized'}));return;}
  if(req.method!=='GET'){res.statusCode=405;res.end();return;}
  const result=await telegram.tick({limit:4});res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result));return;
 }
 if(process.env.VERCEL&&telegram.config().enabled&&telegram.config().ready){
  const work=new Promise(resolve=>res.once('finish',()=>{if(res.statusCode>=400)return resolve();telegram.tick({limit:3}).catch(()=>console.error('Telegram queue processing failed')).finally(resolve);}));
  require('@vercel/functions').waitUntil(work);
 }
 return app(req,res);}catch(e){console.error('Demo initialization:',e.stack||e.message);res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Демоверсия запускается. Повторите через несколько секунд.'}));}
};
