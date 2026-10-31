const { AsyncLocalStorage } = require('node:async_hooks');
const { createHash } = require('node:crypto');
const { DataTypes } = require('sequelize');
const db = require('../database/sequelize');
const ApiError = require('../exceptions/ApiError');
const context = new AsyncLocalStorage();
const Entry = db.define('client_operation', { key: { type: DataTypes.STRING, primaryKey: true }, fingerprint: { type: DataTypes.STRING, allowNull: false }, result: { type: DataTypes.JSONB, allowNull: false } });
const transaction = db.transaction.bind(db), query = db.query.bind(db);
// Existing business services retain their transaction boundaries. For a mobile
// request those services join the outer transaction containing its receipt.
db.transaction = function(options, callback) {
    const current = context.getStore();
    if (current) {
        const action = typeof options === 'function' ? options : callback;
        // Sequelize findOrCreate opens an unmanaged savepoint internally.
        if (!action) return transaction({ ...options, transaction: current });
        return action(current);
    }
    return transaction(options, callback);
};
db.query = function(sql, options) {
    const current = context.getStore();
    return query(sql, current && !options?.transaction ? { ...options, transaction: current } : options);
};
module.exports = async (req, action) => {
    const supplied = req.headers['x-operation-id'];
    if (!supplied) return action();
    if (!/^[a-f0-9-]{36}$/i.test(supplied)) throw ApiError.badRequest('Неверный номер операции');
    const key = req.user.id + ':' + supplied;
    const fingerprint = createHash('sha256').update(JSON.stringify([req.method, req.path, req.body])).digest('hex');
    return transaction(async t => {
        await query('SELECT pg_advisory_xact_lock(hashtext(:key))', { replacements: { key }, transaction: t });
        return context.run(t, async () => {
            const prior = await Entry.findByPk(key);
            if (prior) {
                if (prior.fingerprint !== fingerprint) throw ApiError.badRequest('Номер операции уже использован с другими данными');
                return prior.result;
            }
            const result = JSON.parse(JSON.stringify(await action()));
            await Entry.create({ key, fingerprint, result });
            return result;
        });
    });
};
