require('dotenv').config();
const db = require('../src/database/sequelize');
require('../src/models/models');
require('../src/models/operations');
require('../src/services/legacyBridge').backfill().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.close());
