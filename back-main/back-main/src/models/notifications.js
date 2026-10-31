const db = require('../database/sequelize');
const { DataTypes: D } = require('sequelize');

// Delivery state belongs to this server, never to a cloud stock snapshot.
const TelegramMessage = db.define('telegram_message', {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 },
    key: { type: D.STRING, allowNull: false, unique: true },
    type: { type: D.STRING, allowNull: false },
    entityId: D.UUID,
    chatId: { type: D.STRING, allowNull: false },
    text: { type: D.TEXT, allowNull: false },
    section: D.STRING,
    status: { type: D.STRING, allowNull: false, defaultValue: 'pending' },
    attempts: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
    nextAttemptAt: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
    sentAt: D.DATE,
    messageId: D.STRING,
    lastError: D.STRING
}, { indexes: [{ fields: ['status', 'nextAttemptAt'] }] });
module.exports = { TelegramMessage };
