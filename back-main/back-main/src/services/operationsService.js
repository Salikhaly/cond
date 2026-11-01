const personalDocuments=rows=>rows.filter(r=>r.kind==='withdrawal'||r.reversalOf&&rows.some(o=>o.id===r.reversalOf&&o.kind==='withdrawal')).map(r=>({id:r.id,date:r.date,amount:r.kind==='withdrawal'?Number(r.amount):-Number(r.amount),name:r.reason}));
const db = require('../database/sequelize');
const { Op } = require('sequelize');
const { User, Token, Product, Salary, Income, BusinessRelation, Outcome, OutcomeCategory, Advance, Report, ReportProducts } = require('../models/models');
const M = require('../models/operations');
const ApiError = require('../exceptions/ApiError');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const bridge = require('./legacyBridge');
const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, label, zero = false) => {
    const n = Number(v);
    if (!['number', 'string'].includes(typeof v) || String(v).trim() === '' || !Number.isFinite(n) || (zero ? n < 0 : n <= 0) || n > 1e9 || Math.abs(n - Math.round(n * 10000) / 10000) > 1e-8) throw ApiError.badRequest(`Некорректное значение: ${label} (не более 4 знаков после запятой)`);
    return n;
};
const round = n => Math.round((n + Number.EPSILON) * 10000) / 10000;
const text = (v, label) => { if (typeof v !== 'string' || !v.trim() || v.length > 250) throw ApiError.badRequest(`Укажите ${label}`); return v.trim(); };
const date = v => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) throw ApiError.badRequest('Укажите корректную дату'); return v; };
const required = (v, label) => { if (!v) throw ApiError.notFound(`${label} не найден`); return v; };
const admin = user => { if (user.role !== 'super_admin') throw ApiError.forbiddenRequest('Только администратор'); };
const staff = user => { if (!['super_admin', 'employee'].includes(user.role)) throw ApiError.forbiddenRequest('Нет доступа'); };

async function catalog(user) {
    const products = await Product.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    // Initialize only missing balances; existing production balances are never overwritten.
    for (const p of products) await M.Stock.findOrCreate({ where: { productId: p.id }, defaults: { kg: Number(p.weightTotal) } });
    const stocks = await M.Stock.findAll();
    const displays=await M.ProductDisplay.findAll();
    const stockCounts=await M.StockCount.findAll({where:{status:'posted'},attributes:['lines']});
    const sellingPrices=await M.SellingPrice.findAll();
    const variants=await M.PackagingVariant.findAll();
    const used=await M.Production.findAll({where:{status:{[Op.in]:['draft','posted']}},attributes:['productId'],group:['productId']});
    const personal=user.role==='employee'?await require('./workPolicyService').at(user.id,require('./businessDay').today()):null;
    const profile=user.role==='employee'?await M.WorkProfile.findByPk(user.id):null;
    return products.map(p => {
        const packKg=variants.find(v=>v.productId===p.id)?.kgPerPack??null;
        if (user.role === 'employee') {
            const rate=personal?.pieceRates?.find(r=>r.productId===p.id),piece=!personal||personal.mode==='piece',pack=variants.find(v=>v.productId===p.id);
            const perKg=rate?Number(rate.rate)/(rate.unit==='pack'?Number(packKg):1):profile?.individualRate!=null?Number(profile.individualRate):pack?Number(pack.laborPerPack)/Number(pack.kgPerPack):Number(p.priceForEmployee);
            return {id:p.id,name:p.name,weight:p.weight,packKg,wageMode:personal?.mode||'piece',payRateForKg:piece?perKg:null,payPerPack:piece&&pack?(rate?Number(rate.rate)*(rate.unit==='pack'?1:Number(packKg)):perKg*Number(packKg)):null};
        }
        const s = stocks.find(s => s.productId === p.id);
        const display=displays.find(d=>d.productId===p.id);
        const common = {stockVerified:p.additional?.stockVerified!==false||stockCounts.some(c=>c.lines.some(l=>l.kind==='product'&&Number(l.itemId)===p.id)), packKg,salePrice:sellingPrices.find(x=>x.productId===p.id)?.price ?? null,id: p.id, name: p.name, weight: p.weight, photo:display?.photo || '', description:display?.description || '', image:p.image || '', availableKg: round(Number(s.kg) - Number(s.reservedKg)) };
        if (user.role === 'representative') return common;
        return { ...common,wageRateLocked:used.some(x=>x.productId===p.id), packLaborPerPack:variants.find(v=>v.productId===p.id)?.laborPerPack??null,kg: s.kg, reservedKg: s.reservedKg, priceForEmployee: p.priceForEmployee };
    });
}

async function calculate(productId, kg, tx, workerId, workDate) {
    const recipe = required(await M.Recipe.findOne({ where: { productId, active:true }, transaction: tx }), 'Рецептура');
    const product = required(await Product.findByPk(productId, { transaction: tx }), 'Товар');
    if(!product.is_active)throw ApiError.badRequest('Товар в архиве');
    const lines = [];
    for (const line of [...recipe.lines].sort((a, b) => a.materialId.localeCompare(b.materialId))) {
        const material = required(await M.Material.findByPk(line.materialId, { transaction: tx, ...(tx ? { lock: tx.LOCK.UPDATE } : {}) }), 'Материал');
        if(material.active===false)throw ApiError.badRequest('Материал в архиве: '+material.name);
        const quantity = round(Number(line.quantity) * kg / Number(recipe.outputKg));
        if (quantity <= 0) throw ApiError.badRequest('Слишком малый выпуск для точности учёта');
        lines.push({ materialId: material.id, name: material.name, unit: material.unit, quantity, unitCost: Number(material.unitCost), cost: round(quantity * Number(material.unitCost)), balance: Number(material.quantity), enough: Number(material.quantity) >= quantity });
    }
    const materialCost = round(lines.reduce((s, l) => s + l.cost, 0));
    const variant=await M.PackagingVariant.findByPk(product.id,{transaction:tx});
    const policy=workerId?await require('./workPolicyService').at(workerId,workDate||require('./businessDay').today(),tx):null;
    const profile=workerId?await M.WorkProfile.findByPk(workerId,{transaction:tx}):null;
    const piece=!policy||policy.mode==='piece';
    const personalRate=policy?.pieceRates?.find(r=>r.productId===product.id);
    const personalPerKg=personalRate?Number(personalRate.rate)/(personalRate.unit==='pack'?Number(variant?.kgPerPack||product.weight):1):null;
    const profileRate=profile?.individualRate!=null?Number(profile.individualRate):null;
    const effectiveRate=personalPerKg!=null?personalPerKg:profileRate!=null?profileRate:null;
    const laborCost=piece?money(effectiveRate!=null?kg*effectiveRate:variant?kg/Number(variant.kgPerPack)*Number(variant.laborPerPack):kg*Number(product.priceForEmployee)):0;
    const reportedRate=effectiveRate!=null?effectiveRate:Number(product.priceForEmployee);
    const overheadCost = round(Number(recipe.overhead) * kg / Number(recipe.outputKg));
    return { productId: product.id, productName: product.name, kg, recipeVersion: recipe.version, workMode:policy?.mode||'piece',ratePerKg:piece?reportedRate:0, lines, materialCost, laborCost, overheadCost, totalCost: round(materialCost + laborCost + overheadCost), costPerKg: round((materialCost + laborCost + overheadCost) / kg), enough: lines.every(l => l.enough) };
}

module.exports = {
    catalog, calculate,
    async audit(user) { admin(user); const rows=await M.Audit.findAll({limit:100,order:[['createdAt','DESC']]});const changes=await M.ChangeRecord.findAll({where:{operationId:rows.map(r=>r.operationId)}});return rows.map(r=>({...r.toJSON(),changes:changes.filter(c=>c.operationId===r.operationId)})); },
    async dashboard(user) {
        const products = await catalog(user);
        const own = user.role === 'super_admin' ? {} : { userId: user.id };
        const rawOrders = await M.Order.findAll({ where: own, order: [['createdAt', 'DESC']] });
        const destinations=await M.Destination.findAll({where:{orderId:rawOrders.map(o=>o.id)}});
        const orders=rawOrders.map(o=>({...o.get({plain:true}),destination:destinations.find(d=>d.orderId===o.id)?.get({plain:true})||null}));
        const trade=user.role==='employee'?{}:{...await require('./tradeService').visible(user),...await require('./returnsService').visible(user,orders)};
        if(user.role!=='employee')trade.clientPrices=await M.ClientPrice.findAll({where:user.role==='super_admin'?{}:{customerId:trade.customers.map(c=>c.id),[Op.or]:[{outletId:null},{outletId:trade.outlets.map(o=>o.id)}]},order:[['startsOn','DESC'],['createdAt','DESC'],['id','DESC']]});
        const payees=await User.findAll({where:{role:{[Op.in]:['employee','representative']},...(user.role==='super_admin'?{}:{id:user.id})},attributes:['id','name','role'],order:[['name','ASC']]});
        const ownPayroll=await Salary.findAll({where:{is_active:true,...(user.role==='super_admin'?{}:{userId:user.id})},attributes:['id','userId','total_amount','advanced_amount','date']});
        const payrollExtra={payees,repAccruals:await M.RepAccrual.findAll({where:user.role==='super_admin'?{}:{userId:user.id},order:[['createdAt','DESC']]})};
        Object.assign(payrollExtra,await require('./dailyPayService').visible(user),await require('./wageRequestService').visible(user));
        payrollExtra.payrollPaymentInfo=await M.PayrollPaymentInfo.findAll({where:user.role==='super_admin'?{}:{paymentId:(await M.Payment.findAll({where:{workerId:user.id},attributes:['id']})).map(p=>p.id)}});
        if (user.role === 'representative') return {...trade,products,orders,...payrollExtra,payroll:ownPayroll,payrollAdvances:await Advance.findAll({where:{salaryId:ownPayroll.map(s=>s.id)},attributes:['id','salaryId','amount','payment_type','createdAt']}),payments:await M.Payment.findAll({where:{workerId:user.id}}),company:(await M.Profile.findByPk(user.id))?.company||''};
        const productions = await M.Production.findAll({ where: user.role === 'super_admin' ? {} : { workerId: user.id }, ...(user.role === 'employee' ? {attributes:['id','productId','workerId','kg','date','status','laborCost','postedAt','createdAt']} : {}), order: [['createdAt', 'DESC']] });
        const payments = await M.Payment.findAll({ where: user.role === 'super_admin' ? {} : { workerId: user.id }, order: [['date', 'DESC']] });
        const workers = await User.findAll({ where: { role: 'employee' }, attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] });
        const payroll = ownPayroll;
        Object.assign(payrollExtra,{packagingRuns:await M.PackagingRun.findAll({where:{productionId:productions.map(p=>p.id)}})});
        const payrollAdvances = await Advance.findAll({where:{salaryId:payroll.map(s => s.id)},attributes:['id','salaryId','amount','payment_type','createdAt'],order:[['createdAt','DESC']]});
        if (user.role === 'employee') return { ...payrollExtra,products, archivedProducts:await Product.findAll({where:{is_active:false,id:productions.map(p=>p.productId)},attributes:['id','name','weight']}), productions, payments, payroll, payrollAdvances, workers: workers.filter(w => w.id === user.id) };
        const [materials, receipts, recipes, users, receiptDocuments, incomes, outcomes] = await Promise.all([
            M.Material.findAll({ where:{active:true}, order: [['name', 'ASC']] }), M.Receipt.findAll({ order: [['createdAt', 'DESC']] }), M.Recipe.findAll({where:{active:true}}),
            User.findAll({ attributes: ['id', 'name', 'email', 'role'], order: [['name', 'ASC']] }),
            M.ReceiptDocument.findAll({ order: [['createdAt', 'DESC']] }),
            Income.findAll({ order: [['date', 'DESC']], include: [Product, BusinessRelation] }),
            Outcome.findAll({ order: [['date', 'DESC']], include: [OutcomeCategory] })
        ]);
        const shipmentLinks=await M.LegacyLink.findAll({where:{id:{[Op.like]:'shipment:%'}}});
        const saleRows=incomes.map(row=>{const link=shipmentLinks.find(l=>l.data.incomeId===row.id);return {...row.get({plain:true}),orderId:link?link.id.split(':')[1]:null,destination:link?destinations.find(d=>d.orderId===link.id.split(':')[1])?.get({plain:true})||null:null}});
        const access = await M.Access.findAll();
        const profiles = await M.Profile.findAll();
        const moneyData=await db.transaction({isolationLevel:'REPEATABLE READ'},t=>require('./tradeFinanceService').readData(t));
        Object.assign(trade,await db.transaction({isolationLevel:'REPEATABLE READ'},t=>require('./stockValueService').readData(t)));
        trade.receiptExpenseIds=(await M.LegacyLink.findAll()).filter(l=>l.id.startsWith('receipt:')).map(l=>l.data.outcomeId).filter(Boolean);
        trade.stockCounts=await M.StockCount.findAll({order:[['createdAt','DESC']]});
        trade.receiptDrafts=await M.ReceiptDraft.findAll({order:[['createdAt','DESC']]});trade.receiptCosts=await M.ReceiptCosts.findAll();
        trade.expenseReversals=await M.ExpenseReversal.findAll();
        trade.moneyPersonal=personalDocuments(await M.MoneyDocument.findAll({raw:true}));trade.expenseArticles=await M.ExpenseArticle.findAll();trade.paymentAccounts=await M.MoneyAccount.findAll({where:{active:true},attributes:['id','name','method','defaultForMethod']});
        trade.expenseMeta=await M.ExpenseMeta.findAll();trade.expenseDecisions=await M.ExpenseDecision.findAll();
        trade.packagingVariants=await M.PackagingVariant.findAll();
        return { ...require('./tradeFinanceService').extras(moneyData),...trade,...payrollExtra,products, archivedProducts:await Product.findAll({where:{is_active:false},attributes:['id','name','weight','priceForEmployee']}), archivedRecipes:await M.Recipe.findAll({where:{active:false}}), archivedMaterials:await M.Material.findAll({where:{active:false}}), orders, productions, payments, payroll, payrollAdvances, workers, materials, receipts, recipes, users: users.map(u => ({...u.get({plain:true}), disabled: Boolean(access.find(a => a.userId === u.id)?.disabled), company: profiles.find(p => p.userId === u.id)?.company || ''})), receiptDocuments, incomes:saleRows, outcomes };
    },
    async material(user, body) {
        admin(user);
        if (!['кг', 'л', 'шт'].includes(body.unit)) throw ApiError.badRequest('Единица: кг, л или шт');
        const packUnit = body.packUnit == null || body.packUnit === '' ? null : text(body.packUnit, 'единицу упаковки').slice(0, 32);
        const unitsPerPack = body.unitsPerPack == null || body.unitsPerPack === '' ? null : num(body.unitsPerPack, 'штук в коробке');
        return M.Material.create({ name: text(body.name, 'название'), unit: body.unit, packUnit, unitsPerPack });
    },
    async receipt(user, b, transaction) {
        admin(user);
        const receiptDate = date(b.date);
        if (b.supplier != null && typeof b.supplier !== 'string' || b.document != null && typeof b.document !== 'string') throw ApiError.badRequest('Поставщик и номер документа должны быть текстом');
        const supplier = b.supplier?.trim() ? text(b.supplier, 'поставщика') : 'Без поставщика';
        const document = b.document?.trim() ? text(b.document, 'номер документа') : `ПР-${receiptDate.replaceAll('-', '')}-${randomUUID().slice(0, 4).toUpperCase()}`;
        const input = Array.isArray(b.lines) ? b.lines : [b];
        if (!input.length || input.length > 100) throw ApiError.badRequest('Добавьте материалы');
        const lines=input.map(l=>{
            const materialId=text(l.materialId,'материал');
            const shortageReason = l.shortageReason == null || l.shortageReason === '' ? null : text(l.shortageReason, 'причину недопоставки').slice(0, 64);
            const shortageComment = l.shortageComment == null || l.shortageComment === '' ? null : text(l.shortageComment, 'комментарий к недопоставке').slice(0, 500);
            if (shortageReason === 'Другое' && !shortageComment) throw ApiError.badRequest('Для причины «Другое» укажите комментарий');
            if(l.purchasePack){
                const count=l.purchasePack.count===undefined||l.purchasePack.count===null||l.purchasePack.count===''?1:num(l.purchasePack.count,'количество упаковок');
                const size=num(l.purchasePack.size,'количество в упаковке');
                const hasUnitPrice=l.purchasePack.pricePerUnit!==undefined&&l.purchasePack.pricePerUnit!==null&&l.purchasePack.pricePerUnit!=='';
                const pricePerUnit=hasUnitPrice?num(l.purchasePack.pricePerUnit,'цену за штуку',true):null;
                const price=hasUnitPrice?money(pricePerUnit*size):num(l.purchasePack.price,'цену упаковки',true);
                if(!hasUnitPrice&&Math.abs(price-money(price))>1e-8)throw ApiError.badRequest('Цена упаковки — до двух знаков после запятой');
                const unitPrice=hasUnitPrice?pricePerUnit:round(price/size);
                const quantity=num(count*size,'общее количество');
                const packUnit=l.purchasePack.unit==null||l.purchasePack.unit===''?'коробка':text(l.purchasePack.unit,'единицу упаковки').slice(0,32);
                const lineTotal=hasUnitPrice?money(quantity*unitPrice):money(count*price);
                return {materialId,quantity,unitCost:unitPrice,lineTotal,purchasePack:{count,size,price,pricePerUnit:unitPrice,unit:packUnit},boxCount:count,unitsPerBox:size,pricePerUnit:unitPrice,packUnit,shortageReason,shortageComment};
            }
            const quantity=num(l.quantity,'количество'),unitCost=num(l.unitCost,'цена',true);
            return {materialId,quantity,unitCost,lineTotal:money(quantity*unitCost),shortageReason,shortageComment};
        }).sort((a,b)=>a.materialId.localeCompare(b.materialId));
        if (new Set(lines.map(l => l.materialId)).size !== lines.length) throw ApiError.badRequest('Один материал указан несколько раз');
        if (b.paid !== undefined && typeof b.paid !== 'boolean') throw ApiError.badRequest('Укажите, оплачен ли приход');
        if(b.initialPayment&&b.paid)throw ApiError.badRequest('Укажите оплату одним способом');
        const costs=require('./receiptCostService')(lines,b);
        const receive=async t => {
            const totalCost = money(lines.reduce((s,l)=>s+l.lineTotal,0));
            const doc = await M.ReceiptDocument.create({ document, supplier, date: receiptDate, lines, total: totalCost, paid: Boolean(b.paid) }, { transaction: t });
            if(costs.total||costs.comment)await M.ReceiptCosts.create({receiptId:doc.id,...costs},{transaction:t});
            const [relationSupplier]=await M.Supplier.findOrCreate({where:{name:supplier},transaction:t});
            for (const l of lines) {
                const m = required(await M.Material.findByPk(l.materialId, { transaction: t, lock: t.LOCK.UPDATE }), 'Материал');
                if(m.active===false)throw ApiError.badRequest('Сначала восстановите материал из архива');
                const total = Number(m.quantity) + l.quantity;
                m.unitCost = round((Number(m.quantity) * Number(m.unitCost) + l.lineTotal) / total);
                m.quantity = total;
                await m.save({ transaction: t });
                await M.Receipt.create({ ...l, supplier, document, date: receiptDate }, { transaction: t });
            }
            const [relation] = await BusinessRelation.findOrCreate({ where: { name: supplier, category: 'suppliers' }, transaction: t });
            if (b.paid && totalCost > 0) {
                const [category] = await OutcomeCategory.findOrCreate({ where: { name: 'Закупка сырья и упаковки' }, transaction: t });
                const outcome = await Outcome.create({ recipient: supplier, businessRelationId: relation.id, name: `Оплата прихода ${document}`, unitPrice: totalCost, quantity: 1, totalAmount: totalCost, outcomeCategoryId: category.id, date: receiptDate }, { transaction: t });
                await M.LegacyLink.create({ id: 'receipt:' + doc.id, data: { outcomeId: outcome.id } }, { transaction: t });
            }
            if(b.initialPayment){
                await require('./tradeFinanceService').payment(user,{partyType:'supplier',partyId:relationSupplier.id,amount:b.initialPayment.amount,date:b.initialPayment.date||receiptDate,method:b.initialPayment.method,accountId:b.initialPayment.accountId,comment:b.initialPayment.comment||'Оплата прихода '+document,allocations:[{documentId:doc.id,amount:b.initialPayment.amount}]},t);
                await doc.reload({transaction:t});
            }
            return doc;
        };
        return transaction?receive(transaction):db.transaction(receive);
    },
    async payReceipt(user,id,b){return require('./tradeFinanceService').payReceipt(user,id,b);},
    async expense(user,b){return require('./expenseService').create(user,b);},
    async product(user, b) {
        admin(user);
        return db.transaction(async t => {
            const p = await Product.create({ name: text(b.name, 'название'), weight: num(b.weight, 'вес коробки'), priceForEmployee: num(b.priceForEmployee, 'ставка', true), ingredients: [], additional: [], quantity: 0, weightTotal: 0, priceTotal: 0 }, { transaction: t });
            await M.Stock.create({ productId: p.id }, { transaction: t });
            if (b.salePrice !== undefined && b.salePrice !== '') await M.SellingPrice.create({productId:p.id,price:money(num(b.salePrice,'цена продажи',true))},{transaction:t});
            if(b.photo!==undefined||b.description!==undefined)await require('./tradeService').display(user,p.id,b);
            return p;
        });
    },
    async recipe(user, b) {
        admin(user);
        required(await Product.findByPk(b.productId), 'Товар');
        const outputKg = num(b.outputKg, 'выход продукции'), overhead = num(b.overhead, 'прочие затраты', true);
        if (!Array.isArray(b.lines) || !b.lines.length || b.lines.length > 100) throw ApiError.badRequest('Добавьте материалы');
        const lines = b.lines.map(l => ({ materialId: text(l.materialId, 'материал'), quantity: num(l.quantity, 'расход материала') }));
        if (new Set(lines.map(l => l.materialId)).size !== lines.length) throw ApiError.badRequest('Материал повторяется');
        if (await M.Material.count({ where: { active:true, id: lines.map(l => l.materialId) } }) !== lines.length) throw ApiError.badRequest('Материал не найден');
        return db.transaction(async t => {
            // Product lock serializes first recipe creation as well as subsequent edits.
            const p = await Product.findByPk(b.productId, { transaction: t, lock: t.LOCK.UPDATE });
            const rateLocked=await M.Production.count({where:{productId:p.id,status:{[Op.in]:['draft','posted']}},transaction:t});
            if(rateLocked&&b.priceForEmployee!==undefined&&Number(b.priceForEmployee)!==Number(p.priceForEmployee))throw ApiError.badRequest('По товару уже есть выработка. Изменение ставки оформляется согласованным правилом сотрудника');
            require('./packagingService').validateRecipe(await M.PackagingVariant.findByPk(p.id,{transaction:t}),outputKg,lines);
            if(!p.is_active)throw ApiError.badRequest('Сначала восстановите товар из архива');
            if (b.priceForEmployee !== undefined) await p.update({ priceForEmployee: num(b.priceForEmployee, 'ставка работника', true) }, { transaction: t });
            const pack=await M.PackagingVariant.findByPk(p.id,{transaction:t});
            if(pack&&rateLocked&&b.laborPerPack!==undefined&&Number(b.laborPerPack)!==Number(pack.laborPerPack))throw ApiError.badRequest('Измените оплату через согласованное правило сотрудника');
            if(pack&&b.laborPerPack!==undefined)await pack.update({laborPerPack:num(b.laborPerPack,'оплата за пачку',true)},{transaction:t});
            const [r] = await M.Recipe.findOrCreate({ where: { productId: p.id }, defaults: { outputKg, overhead, lines, version: 0 }, transaction: t });
            if (b.expectedVersion !== undefined && num(b.expectedVersion, 'версия рецептуры', true) !== Number(r.version)) throw new ApiError(409, 'Рецептура уже изменена. Загрузите актуальную версию перед сохранением');
            await r.update({ active:true, outputKg, overhead, lines, version: r.version + 1 }, { transaction: t });
            const calc = await calculate(p.id, outputKg, t);
            await p.update({ priceTotal: money(calc.totalCost / outputKg), ingredients: calc.lines.map(l => ({ name: l.name, weight: l.quantity / outputKg, price: l.unitCost })), additional: [{ name: 'Работа и прочие затраты на кг', price: money((calc.laborCost + calc.overheadCost) / outputKg) }] }, { transaction: t });
            return r;
        });
    },
    async preview(user, b) { admin(user); return calculate(num(b.productId, 'товар'),num(b.kg,'выпуск'),undefined,b.workerId?num(b.workerId,'работник'):undefined,b.date); },
    async production(user, b, transaction) {
        staff(user);
        const workerId = user.role === 'employee' ? user.id : num(b.workerId, 'сотрудник');
        const worker = required(await User.findByPk(workerId), 'Сотрудник');
        if (worker.role !== 'employee') throw ApiError.badRequest('Выберите сотрудника');
        const product = required(await Product.findByPk(num(b.productId, 'товар')), 'Товар');
        if (!product.is_active) throw ApiError.badRequest('Товар неактивен');
        const create=async transaction => {
            const variant=await M.PackagingVariant.findByPk(product.id,{transaction});
            const pack=require('./packagingService').quantity(variant,b);
            const p = await M.Production.create({ workerId, productId: product.id, kg: pack?.kg??num(b.kg, 'выпуск'), date: date(b.date) }, {transaction});
            if(pack)await M.PackagingRun.create({productionId:p.id,sourceId:variant.sourceId,packages:pack.packages,kgPerPack:variant.kgPerPack},{transaction});
            await require('./telegramService').productionCreated(p, product, worker, transaction);
            return p;
        };
        return transaction?create(transaction):db.transaction(create);
    },
    async postProduction(user, id, b = {}) {
        admin(user);
        return db.transaction(async t => {
            const p = required(await M.Production.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }), 'Выпуск');
            if (p.status !== 'draft') throw ApiError.badRequest('Выпуск уже проведён или отменён');
            const product = required(await Product.findByPk(p.productId, { transaction: t, lock: t.LOCK.UPDATE }), 'Товар');
            const calc = await calculate(p.productId,Number(p.kg),t,p.workerId,p.date);
            if (b.expectedCalculation !== undefined) {
                const expected = b.expectedCalculation;
                const fields = ['recipeVersion', 'materialCost', 'laborCost', 'overheadCost', 'totalCost'];
                const same = expected && !Array.isArray(expected) && fields.every(k => Number(expected[k]) === Number(calc[k])) && Array.isArray(expected.lines) && expected.lines.length === calc.lines.length && calc.lines.every(l => expected.lines.some(x => x && x.materialId === l.materialId && Number(x.quantity) === Number(l.quantity) && Number(x.unitCost) === Number(l.unitCost)));
                if (!same) throw new ApiError(409, 'Расчёт изменился. Закройте калькуляцию и нажмите «Проверить выпуск» заново');
            }
            if (!calc.enough) throw ApiError.badRequest('Недостаточно материалов: ' + calc.lines.filter(l => !l.enough).map(l => l.name).join(', '));
            for (const l of calc.lines) await M.Material.decrement('quantity', { by: l.quantity, where: { id: l.materialId }, transaction: t });
            const [stock] = await M.Stock.findOrCreate({ where: { productId: p.productId }, defaults: { kg: product.weightTotal }, transaction: t });
            await stock.reload({transaction:t,lock:t.LOCK.UPDATE});
            await require('./stockValueService').production(stock,p,calc,t);
            await stock.increment('kg', { by: Number(p.kg), transaction: t });
            await stock.reload({ transaction: t });
            await product.update({ weightTotal: stock.kg, quantity: Math.floor(Number(stock.kg) / Number(product.weight)) }, { transaction: t });
            // Serialize payroll updates on the worker, including first salary creation.
            await User.findByPk(p.workerId, { transaction: t, lock: t.LOCK.UPDATE });
            const start = new Date(p.date + 'T00:00:00Z'); start.setUTCDate(1);
            const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
            let salary = await Salary.findOne({ where: { userId: p.workerId, is_active: true, date: { [Op.gte]: start, [Op.lt]: end } }, transaction: t, lock: t.LOCK.UPDATE });
            if (!salary) salary = await Salary.create({ userId: p.workerId, total_amount: 0, date: start }, { transaction: t });
            await salary.increment('total_amount', { by: calc.laborCost, transaction: t });
            await p.update({ status: 'posted', snapshot: calc, materialCost: calc.materialCost, laborCost: calc.laborCost, overheadCost: calc.overheadCost, totalCost: calc.totalCost, postedBy: user.id, postedAt: new Date() }, { transaction: t });
            await product.update({ priceTotal: money(calc.costPerKg) }, { transaction: t });
            await bridge.production(p,t);
            await require('./dailyPayService').recompute(p.workerId,p.date,user,t);
            return p;
        });
    },
    async cancelProduction(user, id) {
        staff(user);
        return db.transaction(async t => {
            const p = required(await M.Production.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }), 'Выпуск');
            if (user.role !== 'super_admin' && p.workerId !== user.id) throw ApiError.forbiddenRequest();
            if (p.status !== 'draft') throw ApiError.badRequest('Можно отменить только непроведённый выпуск');
            return p.update({ status: 'cancelled' }, { transaction: t });
        });
    },
    async order(user, b) {
        if (!['representative', 'super_admin'].includes(user.role)) throw ApiError.forbiddenRequest();
        if (!Array.isArray(b.lines) || !b.lines.length || b.lines.length > 100) throw ApiError.badRequest('Добавьте товары');
        const lines=b.lines.map(l=>({productId:num(l.productId,'товар'),kg:num(l.kg,'количество')})).sort((a,b)=>a.productId-b.productId);
        if(new Set(lines.map(l=>l.productId)).size!==lines.length)throw ApiError.badRequest('Товар повторяется');
        return db.transaction(async t=>{
            let target=null,company;
            if(b.outletId){target=await require('./tradeService').destination(user,b.outletId,t);company=target.customer.name;}
            else if(user.role==='representative'){
                if(await M.Outlet.count({where:{representativeId:user.id,active:true},transaction:t}))throw ApiError.badRequest('Выберите магазин для заявки');
                const profile=await M.Profile.findByPk(user.id,{transaction:t});if(!profile)throw ApiError.badRequest('Администратор должен закрепить за вами магазин');company=profile.company;
            }else company=text(b.company,'организацию');
            const snapshot=[];for(const l of lines){const product=required(await Product.findByPk(l.productId,{transaction:t}),'Товар');if(!product.is_active)throw ApiError.badRequest('Товар неактивен');const price=target?await require('./tradeFinanceService').quote(target.customer.id,target.outlet.id,product.id,date(b.deliveryDate),t):(await M.SellingPrice.findByPk(product.id,{transaction:t}))?.price??null;snapshot.push({...l,name:product.name,price:price==null?null:Number(price)});}
            for(const l of lines){const v=await M.PackagingVariant.findByPk(l.productId,{transaction:t});if(v)require('./packagingService').quantity(v,{kg:l.kg});}
            const o=await M.Order.create({userId:target?target.outlet.representativeId:user.id,company,lines:snapshot,total:snapshot.some(l=>l.price==null)?0:money(snapshot.reduce((n,l)=>n+money(l.kg*l.price),0)),note:String(b.note||'').slice(0,2000),deliveryDate:date(b.deliveryDate)},{transaction:t});
            if(target)await M.Destination.create({orderId:o.id,outletId:target.outlet.id,customerId:target.customer.id,customerName:target.customer.name,outletName:target.outlet.name,address:target.outlet.address,contact:target.outlet.contact,phone:target.outlet.phone,representativeName:user.name},{transaction:t});
            await require('./telegramService').orderCreated(o,target,user,t);
            return o;
        });
    },
    async orderStatus(user, id, b) {
        return db.transaction(async t => {
            await require('./tradeFinanceService').lockOrderParty(id,t);
            const o = required(await M.Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }), 'Заявка');
            if (user.role !== 'super_admin' && !(user.role === 'representative' && o.userId === user.id && b.status === 'cancelled')) throw ApiError.forbiddenRequest();
            const transitions = { submitted: ['approved', 'cancelled'], approved: ['shipped', 'cancelled'] };
            if (!(transitions[o.status] || []).includes(b.status)) throw ApiError.badRequest('Недопустимое изменение статуса');
            if (b.status === 'approved') {
                if (!Array.isArray(b.prices) || b.prices.length !== o.lines.length) throw ApiError.badRequest('Укажите цены всех товаров за кг');
                const lines = o.lines.map((l, i) => ({ ...l, price: money(num(b.prices[i], 'цена за кг', true)) }));
                for(const line of [...lines].sort((a,b)=>a.productId-b.productId)){const stock=required(await M.Stock.findByPk(line.productId,{transaction:t,lock:t.LOCK.UPDATE}),'Остаток');if(Number(stock.kg)-Number(stock.reservedKg)<line.kg)throw ApiError.badRequest('Не хватает готовой продукции для согласования. Сначала подтвердите выпуск');await stock.increment('reservedKg',{by:line.kg,transaction:t})}
                await o.update({ lines, total: money(lines.reduce((s, l) => s + money(l.kg * l.price), 0)) }, { transaction: t });
            }
            if (b.status==='shipped' || b.status==='cancelled'&&o.status==='approved') {
                for (const l of [...o.lines].sort((a, b) => a.productId - b.productId)) {
                    const product = required(await Product.findByPk(l.productId, { transaction: t, lock: t.LOCK.UPDATE }), 'Товар');
                    const stock = required(await M.Stock.findByPk(l.productId, { transaction: t, lock: t.LOCK.UPDATE }), 'Остаток');
                    if (Number(stock.reservedKg) < l.kg || (b.status === 'shipped' && Number(stock.kg) < l.kg)) throw ApiError.badRequest('Остатки изменились. Проверьте склад');
                    await stock.decrement('reservedKg', { by: l.kg, transaction: t });
                    if (b.status === 'shipped') {
                        await require('./stockValueService').shipment(stock,o.id,Number(l.kg),t);
                        await stock.decrement('kg', { by: l.kg, transaction: t });
                        await stock.reload({ transaction: t });
                        await product.update({ weightTotal: stock.kg, quantity: Math.floor(Number(stock.kg) / Number(product.weight)) }, { transaction: t });
                        const [relation] = await BusinessRelation.findOrCreate({ where: { name: o.company, category: 'clients' }, transaction: t });
                        const income = await Income.create({ businessRelationId: relation.id, productId: product.id, weight: product.weight, totalWeight: l.kg, quantity: round(l.kg / Number(product.weight)), unitPrice: l.price, totalAmount: money(l.kg * l.price), date: new Date() }, { transaction: t });
                        await M.LegacyLink.create({ id: `shipment:${o.id}:${l.productId}`, data: { incomeId: income.id } }, { transaction: t });
                    }
                }
            }
            await o.update({status:b.status,...(b.status==='shipped'?{shippedAt:new Date()}:{})},{transaction:t});
            if(b.status==='shipped')await require('./tradeFinanceService').applyAdvance(o,t);
            if(b.status==='shipped')await require('./dailyPayService').forDate(require('./businessDay').day(o.shippedAt),user,t);
            return o;
        });
    },
    async user(user, b) {
        admin(user);
        if (!['employee', 'representative'].includes(b.role)) throw ApiError.badRequest('Неверная роль');
        const email = text(b.email, 'email').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof b.password !== 'string' || b.password.length < 10 || b.password.length > 72) throw ApiError.badRequest('Нужны email и пароль от 10 до 72 символов');
        const company = b.role === 'representative' && b.company ? text(b.company, 'организацию') : null;
        const password = await bcrypt.hash(b.password, 10);
        return db.transaction(async t => {
            const u = await User.create({ email, name: text(b.name, 'имя'), password, role: b.role, email_confirmed: new Date() }, { transaction: t });
            await M.WorkProfile.create({userId:u.id,...require('./workProfileFields')(b)},{transaction:t});
            if (company) await M.Profile.create({ userId: u.id, company }, { transaction: t });
            return { id: u.id, email: u.email, name: u.name, role: u.role };
        });
    },
    async access(user, id, b) {
        admin(user);
        if (typeof b.disabled !== 'boolean') throw ApiError.badRequest('Укажите состояние доступа');
        return db.transaction(async t => {
            const target = required(await User.findByPk(id, {transaction:t, lock:t.LOCK.UPDATE}), 'Пользователь');
            if(process.env.PUBLIC_DEMO==='true'&&['admin@demo.test','worker@demo.test','firm@demo.test'].includes(target.email))throw ApiError.forbiddenRequest('Доступ к общим демо-аккаунтам не изменяется');
            if (target.role === 'super_admin' || target.id === user.id) throw ApiError.forbiddenRequest('Доступ администратора здесь не изменяется');
            await M.Access.upsert({userId:target.id, disabled:b.disabled}, {transaction:t});
            await Token.destroy({where:{userId:target.id}, transaction:t});
            return {id:target.id, disabled:b.disabled};
        });
    },
    async payment(user, b) {
        admin(user);
        const method=b.method||'unknown';if(!['cash','kaspi','bank','unknown'].includes(method))throw ApiError.badRequest('Выберите способ выплаты зарплаты');
        const kind=b.kind===undefined||b.kind===null||b.kind===''?'salary':b.kind;
        if(!['salary','advance'].includes(kind))throw ApiError.badRequest('Выберите вид выплаты');
        const workerId = num(b.workerId, 'сотрудник'), amount = money(num(b.amount, 'сумма'));
        const bounds = b.salaryMonth ? require('./payrollPeriod')(b.salaryMonth) : null;
        if (amount <= 0) throw ApiError.badRequest('Минимальная выплата 0,01 ₸');
        return db.transaction(async t => {
            const worker = required(await User.findByPk(workerId, { transaction: t, lock: t.LOCK.UPDATE }), 'Сотрудник');
            if (!['employee','representative'].includes(worker.role)) throw ApiError.badRequest('Выберите работника или представителя');
            const salaryWhere = {userId:workerId,is_active:true,...(bounds ? {date:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}} : {})};
            const accrued = Number(await Salary.sum('total_amount', { where: salaryWhere, transaction: t }) || 0);
            const paid = Number(await Salary.sum('advanced_amount', { where: salaryWhere, transaction: t }) || 0);
            const excess=amount>Math.max(0,round(accrued-paid));
            if(excess&&b.allowOverAdvance!==true)throw ApiError.badRequest('Подтвердите выдачу аванса сверх начисленного');
            if(amount>99999999.99)throw ApiError.badRequest('Слишком большая сумма выплаты');
            const note=String(b.note || (kind==='advance'?'Аванс':'Выплата зарплаты')).slice(0, 250);
            const payment = await M.Payment.create({ workerId, amount, date: date(b.date), note, kind, salaryMonth: b.salaryMonth || null }, { transaction: t });
            if(excess)await M.PaymentPermission.create({paymentId:payment.id,actorId:user.id,reason:note},{transaction:t});
            if (bounds) await M.PaymentScope.create({paymentId:payment.id,salaryMonth:b.salaryMonth},{transaction:t});
            const advances = await bridge.payment(payment, t);
            const categoryName=kind==='advance'?'Аванс работникам':worker.role==='representative'?'Выплата зарплаты (представители)':'Выплата зарплаты (производство)';
            const [category] = await OutcomeCategory.findOrCreate({ where: { name: categoryName }, transaction: t });
            const out=await Outcome.create({ recipient: worker.name, name: kind==='advance'?'Аванс работнику':'Выплата зарплаты', unitPrice: amount, quantity: 1, totalAmount: amount, outcomeCategoryId: category.id, date: b.date, advanceId: advances[0] }, { transaction: t });
            await require('./moneyService').assign('outcome:'+out.id,{...b,method},user,t);
            await M.PayrollPaymentInfo.create({paymentId:payment.id,method,comment:note,actorId:user.id,actorName:user.name,outcomeId:out.id,advanceIds:advances},{transaction:t});
            return payment;
        });
    },
    async advance(user, b) {
        admin(user);
        const month=b.salaryMonth||((typeof b.date==='string'&&/^\d{4}-\d{2}/.test(b.date))?b.date.slice(0,7):undefined);
        return module.exports.payment(user,{...b,kind:'advance',allowOverAdvance:b.allowOverAdvance!==false,...(month?{salaryMonth:month}:{})});
    },
    async exchange(user) {
        admin(user);
        return db.transaction({ isolationLevel: 'REPEATABLE READ' }, async t => {
            const result = { schema: 'cond.exchange.v1', exportedAt: new Date().toISOString(), currency: 'KZT', integrationStatus: 'adapter_required' };
            for (const [key, model] of Object.entries(M)) result[key] = await model.findAll({ transaction: t });
            result.products = await Product.findAll({ transaction: t });
            result.users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'], transaction: t });
            result.income = await Income.findAll({ transaction: t });
            result.outcomes = await Outcome.findAll({ transaction: t });
            result.salaries = await Salary.findAll({ transaction: t });
            result.businessRelations = await BusinessRelation.findAll({ transaction: t });
            result.advances = await Advance.findAll({ transaction: t });
            result.reports = await Report.findAll({ transaction: t });
            result.reportProducts = await ReportProducts.findAll({ transaction: t });
            for(const name of ['GoodsReturn','ReturnDisposition','ReturnSettlement','CreditUse','ReturnEvent'])result[name]=await M[name].findAll({transaction:t});
            return result;
        });
    }
};
