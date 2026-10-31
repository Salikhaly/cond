const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { User } = require('../../models/models');
const bcrypt = require('bcrypt');
module.exports = async function createSuperAdmin() {
    const emails = String(process.env.SUPERADMIN_EMAILS || '').split(/\s+/).filter(Boolean).map(e => e.toLowerCase());
    if (!emails.length) return;
    if (!process.env.SUPERADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD.length < 10) throw new Error('SUPERADMIN_PASSWORD must contain at least 10 characters');
    const password = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 10);
    for (const email of emails) await User.findOrCreate({ where: { email }, defaults: { name: 'Администратор', role: 'super_admin', password } });
};
