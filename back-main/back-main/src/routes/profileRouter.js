const {Router} = require('express')
const router = new Router()
const ProfileController = require('../controllers/profileController')
const {body} = require('express-validator')
const roleMiddleware = require("../middleware/authMiddleware");


// TODO think out
router.get('/',
    roleMiddleware(),
    ProfileController.getOneUser
)


// get all users
router.get('/employees',
    roleMiddleware(["super_admin"]),
    ProfileController.getUsers
)

// delete user
router.delete('/employees/:id',
    roleMiddleware(["super_admin"]),
    ProfileController.deleteUser
)

// create user
router.post('/employees',
    body('name').isLength({min: 3, max: 32}),
    body('email').isEmail(),
    roleMiddleware(["super_admin"]),
    ProfileController.createUser
)

// update user
router.put('/employees/:id',
    roleMiddleware(["super_admin"]),
    ProfileController.updateUser
)




module.exports = router
