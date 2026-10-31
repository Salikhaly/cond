export function customerPricing(products,rules,outlet,date){
    if(!outlet)return products;
    const eligible=rules.filter(p=>p.customerId===outlet.customerId&&p.startsOn<=date&&(!p.outletId||p.outletId===outlet.id)).sort((a,b)=>String(b.startsOn).localeCompare(String(a.startsOn))||String(b.createdAt).localeCompare(String(a.createdAt))||Number(b.revision||0)-Number(a.revision||0)||String(b.id).localeCompare(String(a.id)));
    return products.map(p=>{const own=eligible.filter(x=>x.productId===p.id),rule=own.find(x=>x.outletId===outlet.id)||own.find(x=>!x.outletId);return rule?{...p,salePrice:Number(rule.price)}:p;});
}
