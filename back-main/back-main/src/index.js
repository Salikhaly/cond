require('dotenv').config();
const app = require('./app');
const db = require('./database/sequelize');
const fs = require('fs'), path = require('path');
let server;
async function start() {
    require('./config/validate')();
    await db.authenticate();
    await db.sync();
    await require('./database/upgradeOperations')();
    if (process.env.LOCAL_DEMO === 'true') await require('./database/seedLocal')();
    else if (process.env.SUPERADMIN_EMAILS) {
        await require('./database/migrations/run_migrations')();
        await require('./database/migrations/create_categories')();
    }
    await require('./services/packCatalogService').ensure();
    await require('./services/packCatalogService').ensureBasePacks();
    if (process.env.NODE_ENV === 'production') {
        const {User} = require('./models/models');
        if (await User.count({where:{email:['admin@local.test','worker@local.test','firm@local.test']}})) throw new Error('Production database contains demo accounts. Startup refused.');
        if (!await User.count({where:{role:'super_admin'}})) throw new Error('No production administrator configured');
    }
    await require('./services/legacyBridge').backfill();
    await require('./services/syncService').initialise();
    require('./services/syncService').startAutomatic();
    require('./services/telegramService').start();
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
    server = app.listen(process.env.PORT || 3000, process.env.HOST || '127.0.0.1', () => console.log('API ready on port ' + (process.env.PORT || 3000)));
}
async function stop() { if (server) server.close(); await require('./services/telegramService').stop(); await db.close(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start().catch(async e => { console.error(e.message); await db.close(); process.exitCode = 1; });
