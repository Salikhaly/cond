const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
export function cartPricing(lines,products){
    const rows=lines.map(l=>{const p=products.find(p=>p.id===l.productId),valid=p?.salePrice!==null&&p?.salePrice!==undefined&&p?.salePrice!==''&&Number.isFinite(Number(p.salePrice))&&Number(p.salePrice)>=0;return {...l,name:p?.name||'Товар',price:valid?Number(p.salePrice):null,total:valid?money(Number(l.kg)*Number(p.salePrice)):null};});
    return {rows,complete:rows.every(l=>l.price!==null),total:money(rows.reduce((s,l)=>s+(l.total||0),0))};
}
