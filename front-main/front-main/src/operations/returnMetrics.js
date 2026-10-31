// Return adjustments are projected for reports; original sales stay immutable.
function returnSales(data) {
  return (data.returns || []).filter(r => r.status === 'posted').flatMap(r => (r.lines || []).map(l => ({
    id: 'return:' + r.id + ':' + l.productId,
    returnId: r.id,
    isReturn: true,
    productId: l.productId,
    product: {
      id: l.productId,
      name: l.name
    },
    date: r.postedAt,
    totalWeight: -Number(l.kg),
    totalAmount: -Number(l.amount),
    unitPrice: Number(l.price),
    businessRelationId: r.customer?.businessRelationId ?? undefined,
    business_relation: {
      name: r.customer?.company || 'Покупатель'
    },
    destination: r.customer?.destination || null
  })));
}
module.exports = {
  returnSales
};
