const db = require('../database/sequelize');
const { Product, ReportProducts, Advance, Salary, Income } = require('../models/models');
const M = require('../models/operations');
const ApiError = require('../exceptions/ApiError');
module.exports = async user => {
    if (user.role !== 'super_admin') throw ApiError.forbiddenRequest();
    return db.transaction({ isolationLevel: 'REPEATABLE READ' }, async t => {
        const read = model => model.findAll({ transaction: t, raw: true });
        const [materials, receipts, productions, products, stocks, orders, payments, links, reportItems, advances, salaries, incomes] = await Promise.all([M.Material, M.Receipt, M.Production, Product, M.Stock, M.Order, M.Payment, M.LegacyLink, ReportProducts, Advance, Salary, Income].map(read));
        const issues = [], close = (a, b, tolerance = 0.00011) => Math.abs(Number(a) - Number(b)) <= tolerance;
        const values=await read(M.StockValue),costEvents=await read(M.CostEvent),stockCounts=await read(M.StockCount);
        for(const v of values){
            const stock=stocks.find(s=>s.productId===v.productId),events=costEvents.filter(e=>e.productId===v.productId&&['opening','production','shipment','return-sale','inventory-in','inventory-out'].includes(e.kind));
            if(!stock||!close(stock.kg,v.kg)||Number(v.knownKg)>Number(v.kg)+.00011||Number(v.knownKg)<0||Number(v.value)<0)issues.push('Стоимость готового склада: нарушен остаток '+v.productId);
            for(const field of ['kg','knownKg','value']){const total=events.reduce((sum,e)=>sum+(['shipment','inventory-out'].includes(e.kind)?-1:1)*Number(e[field]),0);if(!close(total,v[field],.0011))issues.push('Стоимость готового склада: журнал не совпадает с '+field+' '+v.productId);}
        }
        for(const e of costEvents){
            if(Number(e.value)<0||Number(e.knownKg)<0||Number(e.knownKg)>Number(e.kg)+.00011)issues.push('Некорректная сохранённая стоимость '+e.id);
            if(e.kind==='shipment'){const order=orders.find(o=>o.id===e.orderId),line=order?.lines.find(l=>l.productId===e.productId);if(!line||order.status!=='shipped'||!close(line.kg,e.kg))issues.push('Стоимость не совпадает с отгрузкой '+e.id);}
            if(e.kind==='production'){const p=productions.find(p=>'production:'+p.id===e.id);if(!p||p.status!=='posted'||!close(p.totalCost,e.value)||!close(p.kg,e.kg))issues.push('Стоимость не совпадает с выпуском '+e.id);}
        }
        for (const m of materials) {
            const incoming = receipts.filter(r => r.materialId === m.id).reduce((s, r) => s + Number(r.quantity), 0);
            const consumed = productions.filter(p => p.status === 'posted').reduce((s, p) => s + (p.snapshot?.lines || []).filter(l => l.materialId === m.id).reduce((n, l) => n + Number(l.quantity), 0), 0);
            const adjustments=stockCounts.filter(d=>d.status==='posted').reduce((s,d)=>s+d.lines.filter(l=>l.kind==='material'&&l.itemId===m.id).reduce((a,l)=>a+Number(l.delta),0),0);
            if (!close(incoming - consumed + adjustments, m.quantity)) issues.push(`Материал «${m.name}»: приход минус списание не равен остатку`);
        }
        for (const s of stocks) {
            const product = products.find(p => p.id === s.productId);
            const reserve = orders.filter(o => o.status==='approved').reduce((sum, o) => sum + o.lines.filter(l => l.productId === s.productId).reduce((n, l) => n + Number(l.kg), 0), 0);
            if (!product || !close(product.weightTotal, s.kg)) issues.push(`Товар №${s.productId}: вес в старом и новом складе различается`);
            if (!close(s.reservedKg, reserve)) issues.push(`Товар №${s.productId}: резерв не совпадает с заявками`);
            if (Number(s.kg) < 0 || Number(s.reservedKg) < 0 || Number(s.reservedKg) > Number(s.kg)) issues.push(`Товар №${s.productId}: некорректный остаток или резерв`);
            if (product && Number(product.quantity) !== Math.floor((Number(s.kg) + 1e-8) / Number(product.weight))) issues.push(`Товар №${s.productId}: число полных коробок не соответствует весу`);
        }
        const returns=await read(M.GoodsReturn),dispositions=await read(M.ReturnDisposition),settlements=await read(M.ReturnSettlement),uses=await read(M.CreditUse);
        for(const r of returns){
            if(r.status!=='posted'&&(dispositions.some(d=>d.returnId===r.id)||settlements.some(d=>d.returnId===r.id)))issues.push('Непроведённый возврат имеет движения: '+r.id);
            for(const l of r.lines){const placed=dispositions.filter(d=>d.returnId===r.id&&d.productId===l.productId).reduce((s,d)=>s+Number(d.kg),0);if(placed>l.kg+.00001)issues.push('Возврат: распределено больше принятого');}
            if(settlements.filter(s=>s.returnId===r.id).reduce((a,s)=>a+Number(s.amount),0)>Number(r.total)+.011)issues.push('Возврат: расчёты превышают сумму');
        }
        for(const order of orders){const posted=returns.filter(r=>r.orderId===order.id&&r.status==='posted');for(const l of order.lines){if(posted.reduce((s,r)=>s+r.lines.filter(x=>x.productId===l.productId).reduce((n,x)=>n+x.kg,0),0)>Number(l.kg)+.00001)issues.push('Возврат превышает отгрузку');}}
        for(const s of settlements){if(s.kind==='refund'){const outcome=await require('../models/models').Outcome.findByPk(s.outcomeId,{transaction:t});if(!outcome||!close(outcome.totalAmount,s.amount,.011))issues.push('Возврат денег не совпадает с расходом');}const used=uses.filter(a=>a.settlementId===s.id).reduce((n,a)=>n+Number(a.amount),0);if(used>Number(s.amount)+.011||used&&s.kind!=='credit')issues.push('Зачёт превышает доступный остаток');}
        for (const p of productions.filter(p => p.status === 'posted')) {
            const link = links.find(l => l.id === 'production:' + p.id);
            const item = link && reportItems.find(r => r.id === link.data.reportProductId);
            if (!item || !close(item.quantity, p.kg) || !close(item.totalForSalary, p.laborCost, 0.011)) issues.push(`Выпуск ${p.id.slice(0, 8)}: расхождение с прежним отчётом сотрудника`);
        }
        for (const p of payments) {
            const link = links.find(l => l.id === 'payment:' + p.id);
            const amount = (link?.data.advanceIds || []).reduce((sum, id) => sum + Number(advances.find(a => a.id === id)?.amount || 0), 0);
            if (!close(amount, p.amount, 0.011)) issues.push(`Выплата ${p.id.slice(0, 8)}: расхождение с журналом авансов`);
        }
        for (const s of salaries) {
            const sum = advances.filter(a => a.salaryId === s.id).reduce((n, a) => n + Number(a.amount), 0);
            if (!close(sum, s.advanced_amount, 0.011)) issues.push(`Зарплата №${s.id}: сумма авансов отличается от выплаченного`);
        }
        const [dailyPay,dailyRevisions,wageRequests,wageAdjustments,policies,paymentInfo,expenseReversals,expenseMeta,receiptCosts]=await Promise.all([M.DailyPay,M.DailyPayRevision,M.WageRequest,M.WageAdjustment,M.WorkPolicy,M.PayrollPaymentInfo,M.ExpenseReversal,M.ExpenseMeta,M.ReceiptCosts].map(read));
        for(const d of dailyPay){
            const revisions=dailyRevisions.filter(r=>r.dailyId===d.id),latest=revisions.find(r=>r.version===d.version);
            if(!close(revisions.reduce((s,r)=>s+Number(r.delta),0),d.amount,.011)||d.version>0&&(!latest||!close(latest.amount,d.amount,.011)))issues.push('Заработок за день не совпадает с историей начислений '+d.id);
            if(d.status==='posted'&&d.proposedAmount!=null&&!close(d.amount,d.proposedAmount,.011))issues.push('Подтверждённый дневной заработок отличается от расчёта '+d.id);
        }
        for(const a of wageAdjustments){const r=wageRequests.find(r=>r.id===a.requestId);if(!r||r.status!=='posted'||r.type!=='adjustment'||r.userId!==a.userId||!close((r.proposal||r.payload).amount,a.amount,.011))issues.push('Корректировка зарплаты без соответствующего решения '+a.id);}
        for(const p of policies){if(!wageRequests.some(r=>r.id===p.requestId&&r.status==='posted'&&r.type==='policy'&&r.userId===p.userId))issues.push('Условия оплаты не подтверждены решением '+p.id);}
        for(const i of paymentInfo){const p=payments.find(p=>p.id===i.paymentId),ids=i.advanceIds||[];if(!p||!close(ids.reduce((s,id)=>s+Number(advances.find(a=>a.id===id)?.amount||0),0),p.amount,.011))issues.push('Детали выплаты не совпадают с журналом авансов '+i.paymentId);}
        for(const r of expenseReversals){const original=await require('../models/models').Outcome.findByPk(r.outcomeId,{transaction:t}),reverse=await require('../models/models').Outcome.findByPk(r.reversalId,{transaction:t});if(!original||!reverse||!close(Number(original.totalAmount)+Number(reverse.totalAmount),0,.011)||!expenseMeta.some(m=>m.outcomeId===r.reversalId))issues.push('Отмена расхода не согласована с оригиналом '+r.outcomeId);}
        const receiptDocuments=await read(M.ReceiptDocument);
        for(const c of receiptCosts){const r=receiptDocuments.find(r=>r.id===c.receiptId);if(!r||!close((c.charges||[]).reduce((s,l)=>s+Number(l.amount),0),c.total,.011)||!close((r.lines||[]).reduce((s,l)=>s+Number(l.additionalCost||0),0),c.total,.011))issues.push('Дополнительные затраты не распределены по приходу '+c.receiptId);}
        for (const order of orders.filter(o => o.status === 'shipped')) {
            let total = 0;
            for (const line of order.lines) {
                const link = links.find(l => l.id === `shipment:${order.id}:${line.productId}`);
                const income = link && incomes.find(i => i.id === link.data.incomeId);
                if (!income || !(line.unit==='шт'?close(income.quantity,line.kg)&&close(income.totalWeight,0):close(income.totalWeight,line.kg)) || !close(income.totalAmount, Math.round(line.kg * line.price * 100) / 100, 0.011)) issues.push(`Заявка ${order.id.slice(0, 8)}: продажа не совпадает с отгрузкой`);
                total += Number(income?.totalAmount || 0);
            }
            if (!close(total, order.total, 0.011)) issues.push(`Заявка ${order.id.slice(0, 8)}: итог отличается от доходов`);
        }
        const cash=await read(M.CashEntry),allocations=await read(M.CashAllocation),receiptFinance=await read(M.ReceiptFinance);
        const finance=require('./tradeFinanceService'),cashData={entries:cash,allocations,receiptFinance,receipts:receiptDocuments,settlements,credits:uses,returns};
        for(const e of cash){
            const distributed=allocations.filter(a=>a.entryId===e.id).reduce((s,a)=>s+Number(a.amount),0);
            if(Number(e.amount)<=0||distributed>Number(e.amount)+.011)issues.push('Оплата: некорректная сумма или распределение '+e.id);
            if(e.kind==='trade'&&e.direction==='out'&&!close(distributed,e.amount,.011))issues.push('Оплата поставщику не распределена полностью '+e.id);
            if(e.kind==='reversal'){const original=cash.find(o=>o.id===e.reversalOf);if(!original||original.status!=='reversed'||original.direction===e.direction||!close(original.amount,e.amount,.011))issues.push('Не согласованы исходная оплата и отмена '+e.id);}
            if(e.status==='reversed'&&cash.filter(r=>r.reversalOf===e.id).length!==1)issues.push('Нет единственной записи отмены оплаты '+e.id);
            if(e.outcomeId){const out=await require('../models/models').Outcome.findByPk(e.outcomeId,{transaction:t});const expected=e.kind==='reversal'?-Number(e.amount):Number(e.amount);if(!out||!close(out.totalAmount,expected,.011))issues.push('Оплата поставщику не совпадает с расходом '+e.id);}
        }
        for(const r of receiptDocuments){const paid=finance.documentPaid(cashData,'receipt',r.id);if(paid>Number(r.total)+.011||Number(r.total)>0&&Boolean(r.paid)!==(paid>=Number(r.total)-.001))issues.push('Приход: статус или сумма оплаты не совпадают с журналом '+r.id);}
        for(const o of orders.filter(o=>o.status==='shipped'))if(finance.documentPaid(cashData,'order',o.id)+finance.orderCredits(cashData,o.id)>Number(o.total)+.011)issues.push('Оплаты и зачёты превышают сумму отгрузки '+o.id);
        return { checkedAt: new Date().toISOString(), ok: issues.length === 0, issues, counts: { materials: materials.length, products: products.length, productions: productions.filter(p => p.status === 'posted').length, payments: payments.length, orders: orders.length }, scope: 'Сверка данных текущей базы: материалы, остатки, резервы, новые выпуски со старыми отчётами, выплаты с авансами. Исторические данные клиента из другой базы не проверялись.' };
    });
};
