function purchaseComparisons(receipts,materials,from='',to=''){
    const day=r=>String(r.date||r.createdAt||'').slice(0,10),groups=new Map();
    for(const r of receipts){if((from&&day(r)<from)||(to&&day(r)>to))continue;const g=groups.get(r.materialId)||{materialId:r.materialId,name:materials.find(m=>m.id===r.materialId)?.name||'Материал в архиве',unit:materials.find(m=>m.id===r.materialId)?.unit||'ед.',rows:[]};g.rows.push(r);groups.set(r.materialId,g);}
    return [...groups.values()].map(g=>{
        const vendors=new Map();for(const r of g.rows){const name=r.supplier||'Поставщик не указан';if(!vendors.has(name))vendors.set(name,[]);vendors.get(name).push(r);}
        const quotes=[...vendors].map(([supplier,rows])=>{rows.sort((a,b)=>day(b).localeCompare(day(a))||String(b.createdAt).localeCompare(String(a.createdAt)));const last=rows[0],previous=rows[1];return {supplier,price:Number(last.unitCost),date:day(last),previous:previous?Number(previous.unitCost):null,change:previous&&Number(previous.unitCost)!==0?(Number(last.unitCost)/Number(previous.unitCost)-1)*100:null};}).sort((a,b)=>a.price-b.price||a.supplier.localeCompare(b.supplier));
        const quantity=g.rows.reduce((s,r)=>s+Number(r.quantity),0),cost=g.rows.reduce((s,r)=>s+Number(r.quantity)*Number(r.unitCost),0);
        return {...g,quotes,min:Math.min(...quotes.map(q=>q.price)),max:Math.max(...quotes.map(q=>q.price)),weighted:quantity?cost/quantity:null,quantity};
    }).sort((a,b)=>a.name.localeCompare(b.name));
}
module.exports={purchaseComparisons};
