export function allocateOldest(value,documents){
    let left=Math.round(Number(value||0)*100);
    const result={};
    for(const d of [...documents].sort((a,b)=>String(a.date||a.shippedAt||a.deliveryDate||'').localeCompare(String(b.date||b.shippedAt||b.deliveryDate||''))||String(a.id).localeCompare(String(b.id)))){
        const part=Math.min(left,Math.max(0,Math.round(Number(d.debt??d.due??0)*100)));
        if(part>0){result[d.id]=part/100;left-=part;}
    }
    return result;
}
