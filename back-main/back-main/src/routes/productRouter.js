const {Router} = require('express')
const router = new Router()
const productController = require('../controllers/productController')
const {body} = require('express-validator')
const roleMiddleware = require("../middleware/authMiddleware");
const upload = require('../storage/multer')


router.get('/',
    roleMiddleware(),
    productController.getProducts
)


router.get('/:id',
    roleMiddleware(["super_admin"]),
    productController.getOneProduct
)

router.delete('/:id',
    roleMiddleware(["super_admin"]),
    productController.deleteProduct
)

router.post('/',
    roleMiddleware(['super_admin']),
    // body('name').isLength({min: 3, max: 32}),
    // body('ingredients').isString(),
    // body('description').isString(),
    // body('image').is(), // TODO validate size and file format
    upload.single('image'),
    // roleMiddleware(["super_admin"]),
    productController.createProduct
)
// router.post('/', upload.single('image'),(req, res) => {
//         console.log('\n\n\n',req.file, '\n\n\n')
//     }
// )

router.put('/:id',
    roleMiddleware(['super_admin']),
    // roleMiddleware(["super_admin"]),
    upload.single('image'),
    productController.updateProduct
)




module.exports = router
