const db = require('../database/sequelize');
const { DataTypes: D } = require('sequelize');
const State = db.define('sync_state', { key: { type: D.STRING, primaryKey: true }, value: { type: D.JSONB, allowNull: false } });
const Change = db.define('sync_change', { id: { type: D.BIGINT, primaryKey: true, autoIncrement: true }, transactionKey: { type: D.BIGINT, allowNull: false, unique: true }, sentAt: D.DATE });
const Batch = db.define('sync_batch', { id: { type: D.BIGINT, primaryKey: true, autoIncrement: true }, sourceId: { type: D.UUID, allowNull: false }, target: { type: D.STRING, allowNull: false }, eventIds: { type: D.JSONB, allowNull: false }, payload: { type: D.JSONB, allowNull: false }, checksum: { type: D.STRING, allowNull: false }, sentAt: D.DATE });
const Replica = db.define('cloud_replica', { key: { type: D.STRING, primaryKey: true }, sourceId: D.UUID, version: D.BIGINT, payload: D.JSONB, checksum: D.STRING, receivedAt: D.DATE });
module.exports = { State, Change, Batch, Replica };
