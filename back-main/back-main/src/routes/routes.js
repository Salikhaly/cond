const {Router} = require('express')

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/authMiddleware");

const router = new Router()
const profileRouter = require('./profileRouter')
const authRouter = require('./authRouter')
const productRouter = require('./productRouter')
const relationsRouter = require('./relationsRouter')
const reportsRouter = require('./reportsRouter')
const outcomeRouter = require('./outcomeRouter')
const salariesRouter = require('./salariesRouter')
const incomeRouter = require('./incomeRouter')
const analyticRouter = require('./analyticRouter')

router.use('/profile', profileRouter)
router.use('/auth', authRouter)
router.use('/products', productRouter)
router.use('/relations', roleMiddleware(["super_admin"]), relationsRouter)
router.use('/reports', reportsRouter)
router.use('/outcome', outcomeRouter)
router.use('/salaries', roleMiddleware(["super_admin"]), salariesRouter)
router.use('/income', roleMiddleware(["super_admin"]), incomeRouter)
router.use('/analytics', roleMiddleware(["super_admin"]), analyticRouter)

module.exports = router
