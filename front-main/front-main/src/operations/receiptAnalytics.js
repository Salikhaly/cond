const {receiptCurrent}=require('./receiptCurrent');
function day(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function periodRange(kind, today) {
    if (kind === '2m' || kind === '3m' || kind === '12m') {
        const n = kind === '2m' ? 2 : kind === '3m' ? 3 : 12;
        const d = new Date(today + 'T12:00:00Z');
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1), 1));
        return { from: start.toISOString().slice(0, 10), to: today };
    }
    return { from: '', to: today };
}

function lineValues(line, fallbackAmount) {
    const pack = line.purchasePack || {};
    const boxesRaw = line.boxCount ?? pack.count;
    const boxes = boxesRaw === null || boxesRaw === undefined || boxesRaw === '' ? null : Number(boxesRaw);
    const perBoxRaw = line.unitsPerBox ?? pack.size;
    const perBox = perBoxRaw === null || perBoxRaw === undefined || perBoxRaw === '' ? null : Number(perBoxRaw);
    const unitPriceRaw = line.pricePerUnit ?? pack.pricePerUnit ?? (perBox > 0 && pack.price != null ? Number(pack.price) / perBox : line.unitCost);
    const unitPrice = Number(unitPriceRaw) || 0;
    const quantity = Number(line.quantity) || 0;
    let amount = Number(line.lineTotal);
    if (!Number.isFinite(amount) || amount <= 0) amount = Number(line.goodsTotal);
    if (!Number.isFinite(amount) || amount <= 0) amount = quantity * (Number(line.unitCost) || 0);
    if ((!Number.isFinite(amount) || amount <= 0) && boxes !== null && pack.price != null) amount = boxes * Number(pack.price);
    if ((!Number.isFinite(amount) || amount <= 0) && fallbackAmount != null) amount = Number(fallbackAmount);
    return { boxes, perBox, unitPrice, quantity, amount: Number.isFinite(amount) ? amount : 0 };
}

function receiptAnalytics(documents, receipts, materials, options = {}) {
    const from = options.from || '';
    const to = options.to || '';
    const materialId = options.materialId ? String(options.materialId) : '';
    const material = (materials || []).find(m => String(m.id) === materialId) || null;
    const rows = [];
    const seen = new Set();
    for (const original of documents || []) {
        const doc=receiptCurrent(original,options.corrections);
        const date = day(doc.date);
        if (!date || (from && date < from) || (to && date > to)) continue;
        seen.add([doc.supplier, date, doc.document].join('|'));
        const lines = doc.lines || [];
        for (const line of lines) {
            if (materialId && String(line.materialId) !== materialId) continue;
            rows.push({ supplier: doc.supplier || 'Поставщик не указан', date, document: doc.document || '', materialId: line.materialId, reason: line.shortageReason || '', ...lineValues(line, lines.length === 1 ? doc.total : null) });
        }
    }
    // Old receipts without a receipt document still participate in the analysis.
    for (const receipt of receipts || []) {
        const date = day(receipt.date);
        if (!date || (from && date < from) || (to && date > to)) continue;
        if (materialId && String(receipt.materialId) !== materialId) continue;
        if (seen.has([receipt.supplier, date, receipt.document].join('|'))) continue;
        rows.push({ supplier: receipt.supplier || 'Поставщик не указан', date, document: receipt.document || '', materialId: receipt.materialId, reason: receipt.shortageReason || '', ...lineValues(receipt) });
    }
    const collect = (map, key, row, extra = {}) => {
        const group = map.get(key) || { ...extra, boxes: 0, hasBoxes: false, pieces: 0, amount: 0, base: 0, pricedPieces: 0, last: null, reasons: {}, rows: 0 };
        group.rows += 1;
        if (row.boxes !== null && Number.isFinite(row.boxes)) { group.boxes += row.boxes; group.hasBoxes = true; }
        group.pieces += row.quantity;
        group.amount += row.amount;
        if (row.quantity > 0 && row.unitPrice > 0) { group.base += row.unitPrice * row.quantity; group.pricedPieces += row.quantity; }
        if (!group.last || row.date >= group.last.date) group.last = { date: row.date, price: row.unitPrice || null, perBox: row.perBox || null };
        if (row.reason) group.reasons[row.reason] = (group.reasons[row.reason] || 0) + 1;
        map.set(key, group);
    };
    const finish = group => {
        const reasons = Object.entries(group.reasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        return { ...group, avg: group.pricedPieces > 0 ? group.base / group.pricedPieces : null, lastPrice: group.last?.price ?? null, lastPerBox: group.last?.perBox ?? null, topReason: reasons[0]?.[0] || null, topReasonCount: reasons[0]?.[1] || 0 };
    };
    const groups = new Map(), monthlyMap = new Map();
    for (const row of rows) {
        collect(groups, row.supplier, row, { supplier: row.supplier });
        const month = row.date.slice(0, 7);
        collect(monthlyMap, month + '|' + row.supplier, row, { month, supplier: row.supplier });
    }
    const suppliers = [...groups.values()].map(finish).sort((a, b) => b.amount - a.amount || a.supplier.localeCompare(b.supplier));
    const monthly = [...monthlyMap.values()].map(finish).sort((a, b) => b.month.localeCompare(a.month) || (a.avg ?? Infinity) - (b.avg ?? Infinity) || a.supplier.localeCompare(b.supplier));
    const monthCheapest = new Map();
    for (const row of monthly) if (row.avg != null && (monthCheapest.get(row.month) == null || row.avg < monthCheapest.get(row.month))) monthCheapest.set(row.month, row.avg);
    const months = monthly.map(row => {
        const cheapest = monthCheapest.get(row.month);
        return { ...row, delta: row.avg == null || cheapest == null ? null : row.avg - cheapest, deltaPercent: row.avg != null && cheapest ? (row.avg - cheapest) / cheapest * 100 : null };
    });
    const priced = suppliers.filter(s => s.avg != null).sort((a, b) => a.avg - b.avg || a.supplier.localeCompare(b.supplier));
    const cheapest = priced[0]?.avg ?? null;
    const comparison = priced.map(s => ({ ...s, delta: cheapest == null ? null : s.avg - cheapest, deltaPercent: cheapest ? (s.avg - cheapest) / cheapest * 100 : null }));
    return {
        material,
        suppliers,
        comparison,
        months,
        rows: rows.length,
        totals: {
            boxes: suppliers.reduce((sum, s) => sum + (s.hasBoxes ? s.boxes : 0), 0),
            hasBoxes: suppliers.some(s => s.hasBoxes),
            pieces: suppliers.reduce((sum, s) => sum + s.pieces, 0),
            amount: suppliers.reduce((sum, s) => sum + s.amount, 0),
            unknownQuantity: rows.filter(r => !(r.quantity > 0)).length,
        },
    };
}

module.exports = { receiptAnalytics, periodRange, day };
