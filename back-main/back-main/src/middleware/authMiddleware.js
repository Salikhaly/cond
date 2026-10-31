const ApiError = require('../exceptions/ApiError')
const tokenService = require('../services/tokenService');

module.exports = function (roles=[]) {
    // if (req.method === "OPTIONS") {
    //     next()
    // }
    return async function (req, res, next) {
        try {
            const authorizationHeader = req.headers.authorization

            if (!authorizationHeader) {
                return next(ApiError.unauthorizedRequest());
            }
            const accessToken = authorizationHeader.split(' ')[1];
            if (!accessToken) {
                return next(ApiError.unauthorizedRequest());
            }

            // TODO можно ли подделать jwt и енжектить нужную нам роль??
            const userData = tokenService.validateAccessToken(accessToken);
            if (!userData) {
                return next(ApiError.unauthorizedRequest());
            }

            const { User } = require('../models/models');
            const { Access } = require('../models/operations');
            const user = await User.findByPk(userData.id, {attributes: ['id', 'name', 'email', 'role']});
            if (!user || !await tokenService.sessionExists(user.id, userData.sessionId)) return next(ApiError.unauthorizedRequest());
            if ((await Access.findByPk(user.id))?.disabled) return next(ApiError.forbiddenRequest('Доступ к аккаунту закрыт администратором'));
            req.user = user.get({plain: true});

            if (roles.length > 0) {
                // check user role
                let hasRole = false
                if (roles.includes(req.user.role)) {
                    hasRole = true
                }
                if (!hasRole) {
                    return res.status(403).json({error: "Invalid credentials"})
                }
            }

            next();
        } catch(e) {
            return next(e);
        }
    }
}
