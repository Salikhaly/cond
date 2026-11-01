const number = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const day = row => String(row.date || row.createdAt || '').slice(0, 10);
const packLabel = quote => {
    if (!quote.packSize || !Number.isFinite(quote.packSize)) return '—';
    const size = Number(quote.packSize).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
    return size + ' ' + quote.unit + ' / ' + (quote.packUnit || 'упаковка');
};

function purchaseComparisons(receipts, materials, from = '', to = '') {
    const groups = new Map();
    for (const receipt of receipts) {
        const date = day(receipt);
        if ((from && date < from) || (to && date > to)) continue;
        const material = materials.find(item => item.id === receipt.materialId);
        if (!groups.has(receipt.materialId)) {
            groups.set(receipt.materialId, {
                materialId: receipt.materialId,
                name: material?.name || 'Материал в архиве',
                unit: material?.unit || 'ед.',
                rows: [],
            });
        }
        groups.get(receipt.materialId).rows.push(receipt);
    }

    return [...groups.values()].map(group => {
        const vendors = new Map();
        for (const row of group.rows) {
            const supplier = row.supplier || 'Поставщик не указан';
            if (!vendors.has(supplier)) vendors.set(supplier, []);
            vendors.get(supplier).push(row);
        }

        const quotes = [...vendors].map(([supplier, rows]) => {
            rows.sort((a, b) => day(b).localeCompare(day(a)) || String(b.createdAt).localeCompare(String(a.createdAt)));
            const last = rows[0], previous = rows[1];
            const price = number(last.unitCost);
            const packSize = Number(last.unitsPerBox || last.purchasePack?.size || 0) || null;
            const packPrice = last.purchasePack?.price != null
                ? number(last.purchasePack.price)
                : packSize ? number(price * packSize) : null;
            return {
                supplier,
                price,
                date: day(last),
                previous: previous ? number(previous.unitCost) : null,
                change: previous && Number(previous.unitCost) !== 0 ? (price / Number(previous.unitCost) - 1) * 100 : null,
                packSize,
                packUnit: last.packUnit || last.purchasePack?.unit || 'упаковка',
                packPrice,
                packLabel: packLabel({ packSize, unit: group.unit, packUnit: last.packUnit || last.purchasePack?.unit }),
                quantity: number(rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)),
                orders: rows.length,
            };
        }).sort((a, b) => a.price - b.price || a.supplier.localeCompare(b.supplier));

        const best = quotes[0];
        for (const quote of quotes) {
            quote.diff = number(quote.price - best.price);
            quote.diffPercent = best.price ? number((quote.diff / best.price) * 100) : 0;
            quote.isBest = quote.supplier === best.supplier;
        }
        const quantity = group.rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const cost = group.rows.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitCost), 0);
        return {
            ...group,
            quotes,
            best,
            bestSupplier: best.supplier,
            min: best.price,
            max: quotes[quotes.length - 1].price,
            weighted: quantity ? number(cost / quantity) : null,
            quantity,
            packSizes: [...new Set(quotes.map(quote => quote.packSize).filter(Boolean))],
        };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function supplierAnalysis(comparisons, receipts, from = '', to = '') {
    const names = [...new Set(receipts.filter(row => (!from || day(row) >= from) && (!to || day(row) <= to)).map(row => row.supplier || 'Поставщик не указан'))].sort((a, b) => a.localeCompare(b, 'ru'));
    return names.map(supplier => {
        const materials = comparisons.filter(group => group.quotes.some(quote => quote.supplier === supplier));
        const bestCount = materials.filter(group => group.best.supplier === supplier).length;
        let overpay = 0;
        for (const group of materials) {
            const quote = group.quotes.find(item => item.supplier === supplier);
            const selectedRows = receipts.filter(row => row.materialId === group.materialId && (row.supplier || 'Поставщик не указан') === supplier && (!from || day(row) >= from) && (!to || day(row) <= to));
            const quantity = selectedRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
            overpay += Math.max(0, quote.price - group.best.price) * quantity;
        }
        return {
            supplier,
            materials: materials.length,
            bestCount,
            overpay: number(overpay),
        };
    }).sort((a, b) => b.bestCount - a.bestCount || a.overpay - b.overpay || a.supplier.localeCompare(b.supplier, 'ru'));
}

module.exports = { purchaseComparisons, supplierAnalysis };
