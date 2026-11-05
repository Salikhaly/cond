const db = require('./sequelize');
module.exports = async () => db.transaction(async t => {
    await require('../services/legacyBridge').discoverShipmentLinks(t);
    // One-time transition: pending requests no longer reserve warehouse stock.
    await db.query('SELECT pg_advisory_xact_lock(42810241)',{transaction:t});
    const M=require('../models/operations');
    await db.query('ALTER TABLE '+db.getQueryInterface().queryGenerator.quoteTable(M.ProductPack.getTableName())+' ADD COLUMN IF NOT EXISTS "filmMaterialId" UUID REFERENCES materials(id)',{transaction:t});
    await db.query('ALTER TABLE '+db.getQueryInterface().queryGenerator.quoteTable(M.ClientBonus.getTableName())+' ADD COLUMN IF NOT EXISTS goods JSONB',{transaction:t});
    await db.query('ALTER TABLE account_accesses ADD COLUMN IF NOT EXISTS "productionOrders" BOOLEAN NOT NULL DEFAULT FALSE',{transaction:t});
    await require('../models/accountLink').sync({transaction:t});
    for(const model of Object.values(require('../models/storeCatalog')))await model.sync({transaction:t});
    await db.query(`ALTER TABLE product_displays ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT '', ADD COLUMN IF NOT EXISTS "photoVersion" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "catalogGroup" VARCHAR(120) NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "catalogVisible" BOOLEAN NOT NULL DEFAULT FALSE`,{transaction:t});
    await db.query('ALTER TABLE expense_meta ADD COLUMN IF NOT EXISTS \"costGroup\" VARCHAR(255)',{transaction:t});
    await db.query('ALTER TABLE \"work_profiles\" ADD COLUMN IF NOT EXISTS photo TEXT, ADD COLUMN IF NOT EXISTS instagram VARCHAR(255), ADD COLUMN IF NOT EXISTS note TEXT, ADD COLUMN IF NOT EXISTS parents JSONB NOT NULL DEFAULT \'{}\'::jsonb',{transaction:t});
    await db.query('ALTER TABLE "work_policies" ADD COLUMN IF NOT EXISTS "pieceRates" JSONB NOT NULL DEFAULT \'[]\'::jsonb',{transaction:t});
    await db.query('ALTER TABLE work_profiles ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255)',{transaction:t});
    await db.query('ALTER TABLE work_profiles ADD COLUMN IF NOT EXISTS "individualRate" NUMERIC(16,4)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS materials ADD COLUMN IF NOT EXISTS "packUnit" VARCHAR(32), ADD COLUMN IF NOT EXISTS "unitsPerPack" NUMERIC(16,4), ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT \'raw\', ADD COLUMN IF NOT EXISTS "capacityKg" NUMERIC(16,4)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS productions ADD COLUMN IF NOT EXISTS "packId" UUID, ADD COLUMN IF NOT EXISTS boxes NUMERIC(16,4)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS client_prices ADD COLUMN IF NOT EXISTS "packId" UUID',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS work_policies ADD COLUMN IF NOT EXISTS "monthlySalary" NUMERIC(16,4) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "boxRate" NUMERIC(16,4) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "advanceAmount" NUMERIC(16,4) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "advanceDay" INTEGER',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS incomes ADD COLUMN IF NOT EXISTS "packId" UUID, ADD COLUMN IF NOT EXISTS boxes NUMERIC(16,4), ADD COLUMN IF NOT EXISTS unit VARCHAR(16)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS trade_suppliers ADD COLUMN IF NOT EXISTS "defaultUnitsPerPack" NUMERIC(16,4)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS material_receipts ADD COLUMN IF NOT EXISTS "boxCount" NUMERIC(16,4), ADD COLUMN IF NOT EXISTS "unitsPerBox" NUMERIC(16,4), ADD COLUMN IF NOT EXISTS "pricePerUnit" NUMERIC(16,4), ADD COLUMN IF NOT EXISTS "packUnit" VARCHAR(32), ADD COLUMN IF NOT EXISTS "lineTotal" NUMERIC(16,4), ADD COLUMN IF NOT EXISTS "shortageReason" VARCHAR(64), ADD COLUMN IF NOT EXISTS "shortageComment" VARCHAR(500)',{transaction:t});
    await db.query('ALTER TABLE IF EXISTS payroll_payments ADD COLUMN IF NOT EXISTS "kind" VARCHAR(16), ADD COLUMN IF NOT EXISTS "salaryMonth" VARCHAR(7)',{transaction:t});
    await db.query('CREATE INDEX IF NOT EXISTS material_receipts_date_idx ON material_receipts (date)',{transaction:t});
    await db.query('CREATE INDEX IF NOT EXISTS material_receipts_supplier_date_idx ON material_receipts (supplier, date)',{transaction:t});
    await db.query('CREATE INDEX IF NOT EXISTS material_receipts_material_date_idx ON material_receipts ("materialId", date)',{transaction:t});
    await db.query('ALTER TABLE expense_meta ADD COLUMN IF NOT EXISTS "articleId" UUID',{transaction:t});
    await require('../services/expenseArticleService').ensure(t);
    await require('../services/moneyService').ensure(t);
    for(const table of ['materials','recipes'])await db.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`,{transaction:t});
    if(process.env.SYNC_ROLE!=='cloud'&&!await M.LegacyLink.findByPk('reserve-on-approval:v1',{transaction:t})){
        const orders=await M.Order.findAll({where:{status:'approved'},transaction:t});
        const changes=[];
        for(const stock of await M.Stock.findAll({transaction:t,lock:t.LOCK.UPDATE})){
            const reserved=orders.reduce((n,o)=>n+o.lines.filter(l=>l.productId===stock.productId).reduce((a,l)=>a+Number(l.kg),0),0);
            if(reserved>Number(stock.kg)+.00001)throw new Error('Cannot migrate reserve: approved orders exceed stock');
            changes.push({productId:stock.productId,before:Number(stock.reservedKg),after:reserved});if(Math.abs(Number(stock.reservedKg)-reserved)>.00001)await stock.update({reservedKg:reserved},{transaction:t});
        }
        await M.LegacyLink.create({id:'reserve-on-approval:v1',data:{changes,at:new Date().toISOString()}},{transaction:t});
    }
    // Widen physical quantities only. Never use sync({alter:true}) on client data.
    for (const [table, columns] of Object.entries({ products: ['weight', 'weightTotal'], incomes: ['quantity', 'weight', 'totalWeight'], reports: ['total'], report_products: ['quantity'] })) {
        for (const column of columns) {
            const [rows] = await db.query('SELECT numeric_scale FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = :table AND column_name = :column', { replacements: { table, column }, transaction: t });
            if (rows.length && Number(rows[0].numeric_scale || 0) < 4) await db.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE NUMERIC(16,4) USING "${column}"::numeric`, { transaction: t });
        }
    }
});
