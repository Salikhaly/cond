const {Router} = require('express')
const router = new Router()
const analyticController = require('../controllers/analyticController')
const {body} = require('express-validator')
const roleMiddleware = require("../middleware/authMiddleware");


router.get('/:id',
    roleMiddleware(["super_admin"]),
    analyticController.getAnalytic
)




module.exports = router
