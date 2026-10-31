const router = require('express').Router();
const service = require('../services/syncService');
router.post('/receive', require('express').json({ limit: '25mb' }), async (req, res, next) => { try { res.json(await service.receive(req)); } catch (e) { next(e); } });
module.exports = router;
