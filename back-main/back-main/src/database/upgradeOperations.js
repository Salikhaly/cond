const db = require('./sequelize');
module.exports = async () => db.transaction(async t => {
    await require('../services/legacyBridge').discoverShipmentLinks(t);
    // One-time transition: pending requests no longer reserve warehouse stock.
    await db.query('SELECT pg_advisory_xact_lock(42810241)',{transaction:t});
    const M=require('../models/operations');
    await db.query('ALTER TABLE expense_meta ADD COLUMN IF NOT EXISTS \"costGroup\" VARCHAR(255)',{transaction:t});
    await db.query('ALTER TABLE \"work_profiles\" ADD COLUMN IF NOT EXISTS photo TEXT, ADD COLUMN IF NOT EXISTS instagram VARCHAR(255), ADD COLUMN IF NOT EXISTS note TEXT',{transaction:t});
    await db.query('ALTER TABLE "work_policies" ADD COLUMN IF NOT EXISTS "pieceRates" JSONB NOT NULL DEFAULT \'[]\'::jsonb',{transaction:t});
    await db.query('ALTER TABLE work_profiles ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255)',{transaction:t});
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
