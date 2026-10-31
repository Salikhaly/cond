const { Sequelize } = require('sequelize');
const {User, VerfCodes} = require("../models/models");
const moment = require('moment');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mailService = require('./mailService/mailService')
const tokenService = require('./tokenService')
const UserDto = require('../dtos/userDto');
const ApiError = require('../exceptions/ApiError');
const { Op } = require('sequelize')
const db = require('../database/sequelize');
const { Access } = require('../models/operations');
const allowed = async (user, transaction) => { if ((await Access.findByPk(user.id, {transaction}))?.disabled) throw ApiError.forbiddenRequest('Доступ к аккаунту закрыт администратором'); };
class AuthService {

    generateSixDigitCode() {
        const min = 100000; // Минимальное значение (включительно)
        const max = 999999; // Максимальное значение (включительно)
        return crypto.randomInt(min, max + 1);
    }

    async sendCode(email) {
        const verificationCode = this.generateSixDigitCode()
        await db.transaction(async transaction => {
            const user = await User.findOne({where:{email}, transaction, lock:transaction.LOCK.UPDATE});
            if (!user) throw ApiError.unauthorizedRequest();
            await allowed(user,transaction);
            await VerfCodes.update({isActive:false}, {where:{email,isActive:true},transaction});
            await VerfCodes.create({email,code:verificationCode},{transaction});
        });

        await mailService.sendActivationMail(email, verificationCode);
    }

    async checkCode(email, code) {
        return db.transaction(async transaction => {
        const user = await User.findOne({where:{email}, transaction, lock:transaction.LOCK.UPDATE});
        if (!user) throw ApiError.unauthorizedRequest();
        await allowed(user,transaction);
        const fiveMinutesAgo = moment().subtract(2, 'minutes');
        const verfVode = await VerfCodes.findOne({
            where: {
                email,
                code,
                isActive: true,
                createdAt: {
                    [Sequelize.Op.gte]: fiveMinutesAgo.toDate(),
                },
            }, transaction, lock: transaction.LOCK.UPDATE
        })

        if (!verfVode) {
            throw ApiError.badRequest('Код неверный, уже использован или истёк. Запросите новый код.');
        }

        verfVode.isActive = false;
        await verfVode.save({transaction});
        user.email_confirmed = new Date();
        await user.save({transaction})

        const userDto = new UserDto(user);
        const tokens = tokenService.generateToken({...userDto})

        // тут насколько критично вытващить id пользователя из модели user или userDto ??
        await tokenService.saveToken(user.id, tokens.refreshToken, transaction)

        return {
            ...tokens,
            user: userDto
        }
        });
    }


    // in this project no need a registration
    async registration(email) {
        const candidate = await User.findOne({where: {email}})
        if (candidate) {
            throw ApiError.badRequest(`User with this email ${email} already exists`);
        }

        const randomBytes = crypto.randomBytes(20); // 16 байтов = 128 бит
        const randomHash = randomBytes.toString('hex');

        const user = await User.create({email, password: randomHash})

        await this.sendCode(email)

        return {
            status: 'code sent'
        }
    }

    async login(email, password) {
        const candidate = await User.findOne({where: {email}});
        if (!candidate) {
            throw ApiError.badRequest(`User with this email ${email} does not exist`)
        }

        const isPassEquals = await bcrypt.compare(password, candidate.password);
        if (!isPassEquals) {
            throw ApiError.badRequest('Incorrect password');
        }
        await allowed(candidate);

        await this.sendCode(email)

        // const userDto = new UserDto(user);
        // const tokens = tokenService.generateToken({...userDto});
        // // тут насколько критично вытващить id пользователя из модели user или userDto ??
        // await tokenService.saveToken(userDto.id, tokens.refreshToken)

        return {
            status: 'code sent'
        }
    }

    async activate(activationLink) {
        const user  = await User.findOne({where: {activationLink}})
        if (!user) {
            throw ApiError.badRequest('Incorrect activation code')
        }
        user.isActivated = true
        await user.save();
    }

    async logout(refreshToken) {
        return await tokenService.removeToken(refreshToken);
    }

    async refresh(refreshToken) {
        if (!refreshToken) {
            throw ApiError.unauthorizedRequest();
        }

        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromDb = await tokenService.findToken(refreshToken);

        if (!userData || !tokenFromDb) {
            throw ApiError.unauthorizedRequest()
        }

        const user = await User.findOne({where: {email: userData.email}}) //!! email not id


        if (!user) {
            throw ApiError.badRequest('User does not exist')
        }
        await allowed(user);

        const userDto = new UserDto(user);
        const tokens = tokenService.generateToken({...userDto, sessionId: userData.sessionId});

        // тут насколько критично вытващить id пользователя из модели user или userDto ??
        if (userData.sessionId) tokens.refreshToken = refreshToken;
        else { await tokenService.saveToken(user.id, tokens.refreshToken); await tokenService.removeToken(refreshToken); }

        return {
            ...tokens,
            user: userDto
        }
    }

}

module.exports = new AuthService();
