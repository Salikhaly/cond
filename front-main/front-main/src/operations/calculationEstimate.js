const round = value => Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
function calculationEstimate({ recipe, materials, ratePerKg, kg, packKg, laborPerPack,workMode='piece' }) {
    const output = Number(recipe?.outputKg), quantityKg = Number(kg);
    const valid = output > 0 && quantityKg > 0;
    const lines = [...(recipe?.lines || [])].sort((a,b)=>String(a.materialId).localeCompare(String(b.materialId))).map(l => {
        const m = materials.find(m => m.id === l.materialId);
        const quantity = valid ? round(Number(l.quantity || 0) * quantityKg / output) : 0;
        const unitCost = Number(m?.unitCost || 0), balance = Number(m?.quantity || 0);
        return { materialId:l.materialId, name:m?.name || 'Материал не выбран', unit:m?.unit || 'ед.', quantity, unitCost, cost:round(quantity*unitCost), balance, enough:Boolean(m)&&balance>=quantity };
    });
    const materialCost=round(lines.reduce((sum,l)=>sum+l.cost,0)), laborCost=valid&&['piece','monthly_piece','shift_piece'].includes(workMode)?money(packKg&&laborPerPack!=null?quantityKg/Number(packKg)*Number(laborPerPack):quantityKg*Number(ratePerKg||0)):0;
    const overheadCost=valid?round(Number(recipe?.overhead||0)*quantityKg/output):0;
    const totalCost=round(materialCost+laborCost+overheadCost);
    return {kg:quantityKg,recipeVersion:recipe?.version,workMode,ratePerKg:['piece','monthly_piece','shift_piece'].includes(workMode)?Number(ratePerKg||0):0,lines,materialCost,laborCost,overheadCost,totalCost,costPerKg:valid?round(totalCost/quantityKg):0,enough:lines.length>0&&lines.every(l=>l.enough),tooSmall:!valid||!lines.length||lines.some(l=>l.quantity<=0)};
}
module.exports={calculationEstimate};
