require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const db = require('./database/sequelize');
require('./models/models');
require('./models/operations');
require('./models/sync');
require('./models/notifications');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Math.min(2, Math.max(0, Number(process.env.TRUST_PROXY || 0))));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-store');
    req.requestId = require('crypto').randomUUID(); res.setHeader('X-Request-Id', req.requestId);
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin) {
        const allowed = [process.env.CLIENT_URL,process.env.DEV_CLIENT_URL,...(process.env.PUBLIC_DEMO==='true'?[process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host=>'https://'+host):[])].filter(Boolean);
        if (process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEMO === 'true' && ['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress) && req.headers['x-forwarded-host']) allowed.push('http://' + req.headers['x-forwarded-host']);
        if (!allowed.includes(req.headers.origin)) return res.status(403).json({message:'Запрос с этого адреса запрещён'});
    }
    next();
});
app.use(cors({ credentials: true, origin: [process.env.CLIENT_URL, process.env.DEV_CLIENT_URL].filter(Boolean) }));
app.use(cookieParser());
app.use('/api/sync', require('./routes/syncRouter'));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (req, res) => { try { await db.query('SELECT 1'); res.json({ status:'ok', ...(process.env.PUBLIC_DEMO==='true'?{publicDemo:true}:{}), ...(process.env.PRESENTATION_MODE==='true'?{presentation:true,presentationDate:process.env.DB_NAME.slice(-8)}:{}) }); } catch { res.status(503).json({status:'unavailable'}); } });
app.use('/api/operations', require('./routes/operationsRouter'));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
// Old screens remain available for history. All new inventory/payroll writes
// go through the transactional operations module to keep a single ledger.
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    require('./middleware/authMiddleware')()(req, res, async error => {
        if (error) return next(error);
        if (req.user?.role !== 'super_admin') return res.status(403).json({ message: 'Предыдущие разделы доступны только администратору' });
        try{await require('./services/authorityService').owner(req.user);}catch(e){return next(e);}
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return res.status(409).json({ message: 'Проводите новые операции в основном рабочем месте. Предыдущие разделы доступны для истории.' });
        next();
    });
});
app.use('/api', require('./routes/routes'));
app.use(require('./middleware/errorMiddleware'));

module.exports = app;
