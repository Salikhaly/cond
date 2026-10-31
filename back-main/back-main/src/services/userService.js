const {User} = require("../models/models");
const bcrypt = require('bcrypt');
const mailService = require('./mailService/mailService')
const UserDto = require('../dtos/userDto');
const UserProfileDto = require('../dtos/UserProfileDto');
const ApiError = require('../exceptions/ApiError');
class UserService {

    generateStrongPassword(length = 12) {
        const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
        const numericChars = '0123456789';
        const specialChars = '!@#$%^&*()-_=+';

        // Combine all characters
        const allChars = uppercaseChars + lowercaseChars + numericChars + specialChars;

        let password = '';

        // Add at least one character from each character set
        password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
        password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
        password += numericChars.charAt(Math.floor(Math.random() * numericChars.length));
        password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

        // Add remaining characters randomly
        for (let i = 8; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        // Shuffle the characters to make the password more random
        password = password.split('').sort(() => Math.random() - 0.5).join('');

        return password;
    }
    async create(email, name) {
        const candidate = await User.findOne({where: {email}})
        if (candidate) {
            throw ApiError.badRequest(`User with this email ${email} already exists`);
        }
        const generatedPassword = this.generateStrongPassword();
        const hashPassword = await bcrypt.hash(generatedPassword, 3)

        const user = await User.create({email, password: hashPassword, name})

        await mailService.sendActivationMail(email, `${generatedPassword}`);

        return {
            user: new UserDto(user)
        }
    }
    async update(name, id) {
        const user = await User.findOne({where: {id}})
        if (!user) {
            throw ApiError.badRequest(`User with userId ${id} not found`);
        }
        user.name = name
        if (!user.save()) {
            throw ApiError.badRequest(`Up to date user name for this userId ${id} does not saved`)
        }
        return {
            user: new UserDto(user)
        }
    }

    async delete(id) {
        const deletedUser = await User.destroy({where: {id}})

        if (deletedUser) {
            return { "message": "Employee deleted successfully" }
        } else {
            throw ApiError.badRequest(`User with userId ${id} not found`); // Employee not found
        }


    }

    async getAllUsers() {
        return await User.findAll({attributes: {exclude: ['password']}, order: [['createdAt', 'DESC']]});
    }

    async getUserByEmail(email) {
        const user = await User.findOne({where:{email:email}})
        if (!user) {
            throw ApiError.badRequest(`User with this id ${email} does not exist`)
        }

        return user;
    }

    async getUserById(userId) {
        const user = await User.findOne({where:{id:userId}})
        if (!user) {
            throw ApiError.badRequest(`User with this id ${userId} does not exist`)
        }

        return new UserDto(user);
    }
    async getInsideUserById(userId) {
        const user = await User.findOne({where:{id:userId}})
        if (!user) {
            throw ApiError.badRequest(`User with this id ${userId} does not exist`)
        }

        return user;
    }
}

module.exports = new UserService();
