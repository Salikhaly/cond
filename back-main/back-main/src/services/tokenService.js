const jwt = require('jsonwebtoken')
const {Token} = require('../models/models')
const ApiError = require('../exceptions/ApiError');
const { randomUUID } = require('crypto');
class TokenService {
    generateToken(payload) {
        payload = { ...payload, sessionId: payload.sessionId || randomUUID() };
        const accessToken = jwt.sign({...payload, tokenType: 'access'}, process.env.SECRET_KEY, {expiresIn: '30m'})
        const refreshToken = jwt.sign({...payload, tokenType: 'refresh'}, process.env.SECRET_KEY, {expiresIn: '30d'})

        return {
            accessToken,
            refreshToken
        }

    }

    async saveToken(userId, refreshToken, transaction) {
        const [token] = await Token.findOrCreate({where: {refreshToken}, defaults: {userId}, transaction});
        const sessions = await Token.findAll({where: {userId}, order: [['id', 'DESC']], transaction});
        for (const stale of sessions.slice(10)) await stale.destroy({transaction});
        return token;
    }

    async removeToken(refreshToken){
        if (!refreshToken) {
            throw ApiError.badRequest('Refresh token does not exist', [])
        }
        return await Token.destroy({where: {refreshToken}});
    }

    validateRefreshToken(token) {
        try {
            const data = jwt.verify(token, process.env.SECRET_KEY);
            return data.tokenType === 'refresh' ? data : null;
        } catch (e) {
            return null;

        }
    }

    validateAccessToken(token) {
        try {
            const data = jwt.verify(token, process.env.SECRET_KEY);
            return data.tokenType === 'access' ? data : null;
        } catch (e) {
            return null;

        }
    }

    async findToken(refreshToken) {
        return await Token.findOne({where: {refreshToken}});
    }
    async sessionExists(userId, sessionId) {
        if (!sessionId) return false;
        const sessions = await Token.findAll({where: {userId}, attributes: ['refreshToken']});
        return sessions.some(s => { const payload = jwt.decode(s.refreshToken); return payload?.sessionId === sessionId && Boolean(this.validateRefreshToken(s.refreshToken)); });
    }

}

module.exports = new TokenService();
