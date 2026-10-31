const {Router} = require('express')
const router = new Router()
const reportsController = require('../controllers/reportsController')
const {body} = require('express-validator')
const roleMiddleware = require("../middleware/authMiddleware");


// router.get('/clients',
//     relationsController.getClients
// )
router.get('/',
    roleMiddleware(),
    reportsController.getReports
)
router.get('/statistics',
    roleMiddleware(['super_admin']),
    reportsController.getAllForStatistic
)
router.get('/:employeeId',
    roleMiddleware(['super_admin']),
    reportsController.getReportsByEmployee
)

router.post('/',
    // body('name').isString(),
    // body('category').isString(),
    roleMiddleware(),
    reportsController.createReport
)


router.post('/:id/products',
    // body('name').isString(),
    // body('category').isString(),
    roleMiddleware(),
    reportsController.addProduct
)
router.put('/:id/products/:productId',
    // body('name').isString(),
    // body('category').isString(),
    roleMiddleware(),
    reportsController.updateProductData
)
router.delete('/:id/products/:productId',
    // body('name').isString(),
    // body('category').isString(),
    roleMiddleware(),
    reportsController.deleteReportProduct
)
router.get('/:id/products',
    // body('name').isString(),
    // body('category').isString(),
    roleMiddleware(),
    reportsController.getAllProducts
)

// router.post('/clients',
//     body('name').isString(),
//     relationsController.createClient
// )


// не нужная секция кода
router.get('/:id',
    roleMiddleware(),
    reportsController.getOneReport
)

router.put('/:id',
    roleMiddleware(),
    reportsController.updateReport
)

router.delete('/:id',
    roleMiddleware(),
    reportsController.deleteReport
)


// router.put('/:id',
//     roleMiddleware(["super_admin"]),
//     productController.updateProduct
// )




module.exports = router
