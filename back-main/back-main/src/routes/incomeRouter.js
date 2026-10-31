const {Router} = require('express')
const router = new Router()
const incomeController = require('../controllers/incomeController')
const roleMiddleware = require("../middleware/authMiddleware");


router.post('/',
    roleMiddleware(['super_admin']),
    incomeController.create
)

router.get('/',
    roleMiddleware(['super_admin']),
    incomeController.getAll
)
router.get('/download',
    roleMiddleware(['super_admin']),
    incomeController.download
)
router.get('/download-client',
    roleMiddleware(['super_admin']),
    incomeController.downloadForClient
)

router.put('/:incomeId',
    roleMiddleware(['super_admin']),
    incomeController.update
)

router.delete('/:incomeId',
    roleMiddleware(['super_admin']),
    incomeController.delete
)


//
// router.get('/categories',
//     roleMiddleware(['super_admin']),
//     outcomeController.getAllCategories
// )
//
// router.post('/categories',
//     roleMiddleware(['super_admin']),
//     outcomeController.createCategory
// )
//
// router.put('/categories/:categoryId',
//     roleMiddleware(['super_admin']),
//     outcomeController.updateCategory
// )
//
// router.delete('/categories/:categoryId',
//     roleMiddleware(['super_admin']),
//     outcomeController.deleteCategory
// )

module.exports = router