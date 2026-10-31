const {Router} = require('express')
const router = new Router()
const outcomeController = require('../controllers/outcomeController')
const roleMiddleware = require("../middleware/authMiddleware");


router.post('/',
    roleMiddleware(['super_admin']),
    outcomeController.create
)

router.get('/',
    roleMiddleware(['super_admin']),
    outcomeController.getAll
)
router.get('/download',
    roleMiddleware(['super_admin']),
    outcomeController.download
)

router.put('/:outcomeId',
    roleMiddleware(['super_admin']),
    outcomeController.update
)

router.delete('/:outcomeId',
    roleMiddleware(['super_admin']),
    outcomeController.delete
)



router.get('/categories',
    roleMiddleware(['super_admin']),
    outcomeController.getAllCategories
)

router.post('/categories',
    roleMiddleware(['super_admin']),
    outcomeController.createCategory
)

router.put('/categories/:categoryId',
    roleMiddleware(['super_admin']),
    outcomeController.updateCategory
)

router.delete('/categories/:categoryId',
    roleMiddleware(['super_admin']),
    outcomeController.deleteCategory
)

module.exports = router