const router=require('express').Router(),service=require('../services/storeCatalogService'),idempotent=require('../services/idempotency'),ApiError=require('../exceptions/ApiError');
router.use(async(req,res,next)=>{try{res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');req.catalog=await service.authenticate(req.headers.authorization);await service.limit(req.catalog,req.ip,req.method==='POST'?'order':req.path.startsWith('/media/')?'image':'read');next();}catch(e){next(e);}});
router.get('/',async(req,res,next)=>{try{res.json(await service.catalog(req.catalog,req.query));}catch(e){next(e);}});
router.get('/media/:id',async(req,res,next)=>{try{const image=await service.media(req.catalog,req.params.id,req.query.size);res.type(image.type).send(image.bytes);}catch(e){next(e);}});
router.post('/orders',async(req,res,next)=>{try{if(!req.headers['x-operation-id'])throw ApiError.badRequest('Не удалось сохранить номер заявки. Обновите страницу.');req.user={id:'store:'+req.catalog.link.id};res.json(await idempotent(req,()=>service.submit(req.catalog,req.body)));}catch(e){next(e);}});
module.exports=router;
