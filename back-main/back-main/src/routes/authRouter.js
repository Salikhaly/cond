const {Router} = require('express')
const router = new Router()
const AuthController = require('../controllers/authController')
const {body} = require('express-validator')
const attempts = new Map();
router.use((req, res, next) => {
    if (!['/login', '/activate'].includes(req.path)) return next();
    const now = Date.now(), key = req.ip + ':' + req.path;
    if (attempts.size > 1000) for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    let entry = attempts.get(key);
    if (!entry || entry.until < now) entry = { count: 0, until: now + 60000 };
    attempts.set(key, entry);
    if (++entry.count > 20) return res.status(429).json({message: 'Слишком много попыток. Попробуйте через минуту.'});
    next();
});

router.post('/login',
    body('email').isEmail(),
    body('password').isLength({min: 3, max: 72}),
    AuthController.login
)
// router.post('/check-code',
router.post('/activate',
    body('email').isEmail(),
    body('code').matches(/^\d{6}$/),
    AuthController.checkCode
)
router.post('/logout', AuthController.logout)
// router.get('/activate/:link', AuthController.activate)
router.get('/refresh', AuthController.refresh)


module.exports = router
