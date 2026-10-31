'use strict';
const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const hashedPassword = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 10);

        await queryInterface.bulkInsert('users', [{
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'super_admin',
            createdAt: new Date(),
            updatedAt: new Date()
        }], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('users', { email: process.env.SUPERADMIN_EMAIL }, {});
    }
};
