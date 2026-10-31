const ApiError = require("../exceptions/ApiError")
const userService = require('../services/userService')
const {validationResult} = require('express-validator')
const UserProfileDto = require("../dtos/UserProfileDto");

class ProfileController {

    async createUser(req, res, next) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return next(ApiError.badRequest('Validation errors', errors.array()))
            }

            const {email, name} = req.body;

            const user = await userService.create(email, name);


            return res.json(user);
        } catch(e) {
            next(e)
        }
    }

    async getUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            return res.json(users);
        } catch(e) {
            next(e)
        }
    }


    // TODO endpoint delete user
    async deleteUser(req, res, next) {
        try {
            const employeeId = req.params.id;

            const deleted = await userService.delete(employeeId);
            return res.json(deleted);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint update user
    async updateUser(req, res, next) {
        try {
            const employeeId = req.params.id;
            const name = req.body.name; // data for updating

            const user = await userService.update(name, employeeId);
            return res.json(user);
        } catch(e) {
            next(e)
        }
    }

    // TODO endpoint get one user
    async getOneUser(req, res, next) {
        try {
            const {email} = req.user

            const user = await userService.getUserByEmail(email);

            // console.log('\n\n\n', req.user,'\n\n\n')
            return res.json(new UserProfileDto(user));
        } catch(e) {
            next(e)
        }
    }

}

module.exports = new ProfileController()