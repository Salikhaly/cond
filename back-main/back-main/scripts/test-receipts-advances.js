module.exports = async ({ call, check, admin, worker, dash, d, product }) => {
    const stamp = Date.now();
    const egg = await call(admin, '/operations/materials', { name: 'Яйцо тест ' + stamp, unit: 'шт', packUnit: 'коробка', unitsPerPack: 306 });
    const supplier = await call(admin, '/operations/suppliers', { name: 'Яйца тест ' + stamp, defaultUnitsPerPack: 306 });
    const packDoc = await call(admin, '/operations/receipts', {
        supplier: supplier.name,
        document: 'EGG-' + stamp,
        date: d,
        lines: [{ materialId: egg.id, purchasePack: { count: 10, size: 306, pricePerUnit: 35, unit: 'коробка' } }],
    });
    check(Number(packDoc.total) === 107100 && packDoc.lines[0].boxCount === 10 && packDoc.lines[0].unitsPerBox === 306, 'Receipt stores boxes, pieces per box and amount 10 × 306 × 35');
    let current = await dash();
    let material = current.materials.find(m => m.id === egg.id);
    check(Number(material.quantity) === 3060 && Number(material.unitCost) === 35, 'Egg stock is kept in pieces at price per piece');

    const oldStyle = await call(admin, '/operations/receipts', {
        supplier: supplier.name,
        document: 'OLD-' + stamp,
        date: d,
        lines: [{ materialId: egg.id, purchasePack: { count: 1, size: 10, price: 350 } }],
    });
    check(Number(oldStyle.total) === 350, 'Old pack payload with price per pack remains supported');

    const egg2 = await call(admin, '/operations/materials', { name: 'Яйцо без коробок ' + stamp, unit: 'шт', packUnit: 'коробка', unitsPerPack: 240 });
    const noCount = await call(admin, '/operations/receipts', { supplier: supplier.name, document: 'NOCOUNT-' + stamp, date: d, lines: [{ materialId: egg2.id, purchasePack: { size: 240, pricePerUnit: 40, unit: 'коробка' } }] });
    check(Number(noCount.total) === 9600 && Number(noCount.lines[0].quantity) === 240 && noCount.lines[0].boxCount === 1, 'Box count is optional and defaults to one box');

    const shortDoc = await call(admin, '/operations/receipts', {
        supplier: supplier.name,
        document: 'SHORT-' + stamp,
        date: d,
        lines: [{ materialId: egg.id, purchasePack: { count: 9, size: 306, pricePerUnit: 35, unit: 'коробка' }, shortageReason: 'Недовоз', shortageComment: 'Привезли 9 коробок' }],
    });
    check(Number(shortDoc.total) === 96390 && shortDoc.lines[0].shortageReason === 'Недовоз', 'Receipt stores a shortage reason without breaking the amount');

    current = await dash();
    const { receiptAnalytics } = require('../../../front-main/front-main/src/operations/receiptAnalytics');
    const analytics = receiptAnalytics(current.receiptDocuments, current.receipts, current.materials, { from: d, to: d, materialId: egg.id });
    check(analytics.totals.boxes === 20 && analytics.totals.pieces === 5824 && analytics.totals.amount === 203840 && analytics.suppliers[0]?.topReason === 'Недовоз', 'Receipt analytics counts boxes, pieces, amount and the most frequent shortage reason');

    const workerId = current.workers[0].id, workerName = current.workers[0].name;
    await call(admin, '/operations/work-profiles/' + workerId, { name: workerName, individualRate: 200 }, 'PATCH');
    const production = await call(admin, '/operations/productions', { productId: product.id, workerId, kg: 0.5, date: d });
    const posted = await call(admin, '/operations/productions/' + production.id + '/post', {});
    check(Number(posted.laborCost) === 100 && Number(posted.snapshot.ratePerKg) === 200, 'Individual rate applies to a new production and is saved in its snapshot');

    const paymentsBefore=(await dash()).payments.length;
    await call(admin,'/operations/advances',{workerId,amount:500,date:d,method:'cash'},'POST',400);
    check((await dash()).payments.length===paymentsBefore,'Excess advance without explicit confirmation leaves payments unchanged');
    const advance = await call(admin, '/operations/advances', { workerId, amount: 500, date: d, method: 'cash', note: 'Тестовый аванс', allowOverAdvance:true });
    check(advance.kind === 'advance' && advance.salaryMonth === d.slice(0, 7), 'Advance is stored as a separate payment kind for the salary month');
    current = await dash();
    const payment = current.payments.find(p => p.id === advance.id);
    const { payrollMetrics } = require('../../../front-main/front-main/src/operations/payrollMetrics');
    const metrics = payrollMetrics(current, workerId, d.slice(0, 7));
    check(payment?.kind === 'advance' && metrics.advancePaid >= 500, 'Payroll report splits advance from salary');
    const final = await call(admin, '/operations/reconciliation');
    check(final.ok, 'Reconciliation passes after pack receipts, individual rate and advance');
    void worker;
};
