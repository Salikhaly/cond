require('dotenv').config();
const db = require('../src/database/sequelize');
async function main() {
    if (process.env.NODE_ENV !== 'production') throw new Error('Run with NODE_ENV=production and the actual server environment');
    require('../src/config/validate')();
    await db.authenticate();
    const [roles] = await db.query('SELECT usesuper FROM pg_user WHERE usename=current_user');
    if (roles[0]?.usesuper) throw new Error('Application database role must not be a PostgreSQL superuser');
    const [demo] = await db.query("SELECT count(*)::int AS count FROM users WHERE email IN ('admin@local.test','worker@local.test','firm@local.test')");
    if (demo[0].count) throw new Error('Demo accounts exist in the production database');
    const [admins] = await db.query("SELECT count(*)::int AS count FROM users WHERE role='super_admin'");
    if (!admins[0].count) throw new Error('No administrator exists');
    const mail = require('../src/services/mailService/mailService');
    await mail.transporter.verify();
    console.log('PASS production settings, database, non-superuser role, no demo accounts, administrator and SMTP connection/authentication');
    console.log('SMTP verify sends no email. Verify actual code delivery and phone installation separately.');
}
main().catch(e => { console.error(e.message); process.exitCode=1; }).finally(() => db.close());
