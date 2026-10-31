const {Router} = require('express')
const router = new Router()
const salariesController = require('../controllers/salariesController')
const roleMiddleware = require("../middleware/authMiddleware");


router.post('/:userId',
    salariesController.create
)

router.get('/:salaryId',
    salariesController.getOne
)

router.get('/all/:userId',
    salariesController.getAll
)

router.put('/:salaryId',
    salariesController.update
)

router.delete('/:salaryId',
    salariesController.delete
)



router.post('/advances/:salaryId',
    salariesController.createAdvance
)

router.put('/advances/:advanceId',
    salariesController.updateAdvance
)

router.delete('/advances/:advanceId',
    salariesController.deleteAdvance
)

router.get('/advances/:salaryId',
    salariesController.getAdvances
)


module.exports = router