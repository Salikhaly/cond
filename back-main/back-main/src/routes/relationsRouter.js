const {Router} = require('express')
const router = new Router()
const relationsController = require('../controllers/relationsController')
const {body} = require('express-validator')


router.get('/',
    relationsController.getRelations
)
router.get('/clients',
    relationsController.getClients
)
router.get('/suppliers',
    relationsController.getSuppliers
)

router.post('/',
    body('name').isString(),
    body('category').isString(),
    relationsController.createRelation
)


router.post('/:id/products',
    // body('name').isString(),
    // body('category').isString(),
    relationsController.addProduct
)
router.put('/:id/products/:productId',
    // body('name').isString(),
    // body('category').isString(),
    relationsController.updateProductPrice
)
router.delete('/:id/products/:productId',
    // body('name').isString(),
    // body('category').isString(),
    relationsController.deleteProduct
)

// all by partner
router.get('/:id/products',
    // body('name').isString(),
    // body('category').isString(),
    relationsController.getAllProducts
)

// // just all
// router.get('/products',
//     // body('name').isString(),
//     // body('category').isString(),
//     relationsController.getProducts
// )


router.get('/:id',
    relationsController.getOneRelation
)

router.put('/:id',
    relationsController.updateRelation
)

router.delete('/:id',
    relationsController.deleteRelation
)




module.exports = router
