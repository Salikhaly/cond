// Cookies ignore TCP ports. Keep parallel local databases in separate sessions.
const local = process.env.LOCAL_DEMO === 'true';
const suffix = require('node:crypto').createHash('sha256').update(process.env.DB_NAME || 'local').digest('hex').slice(0, 12);
module.exports = {
    name: local ? 'cond_refresh_' + suffix : 'refreshToken',
    options: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    maxAge: 30 * 86400000
};
