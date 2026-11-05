const ApiError=require('../exceptions/ApiError');
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100,round=n=>Math.round((Number(n)+Number.EPSILON)*10000)/10000;
const num=(v,label,zero=false)=>{const n=Number(typeof v==='string'?v.trim().replace(',','.'):v);if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||(zero?n<0:n<=0)||n>1e9||Math.abs(n-round(n))>1e-8)throw ApiError.badRequest('Проверьте: '+label);return n;};
const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>250)throw ApiError.badRequest('Укажите '+label);return v.trim();};
module.exports=b=>{
        const input = Array.isArray(b.lines) ? b.lines : [b];
        if (!input.length || input.length > 100) throw ApiError.badRequest('Добавьте материалы');
        const lines=input.map(l=>{
            const materialId=text(l.materialId,'материал').toLowerCase();
            const shortageReason = l.shortageReason == null || l.shortageReason === '' ? null : text(l.shortageReason, 'причину недопоставки').slice(0, 64);
            const shortageComment = l.shortageComment == null || l.shortageComment === '' ? null : text(l.shortageComment, 'комментарий к недопоставке').slice(0, 500);
            if (shortageReason === 'Другое' && !shortageComment) throw ApiError.badRequest('Для причины «Другое» укажите комментарий');
            if(l.purchasePack){
                const count=l.purchasePack.count===undefined||l.purchasePack.count===null||l.purchasePack.count===''?1:num(l.purchasePack.count,'количество упаковок');
                const size=num(l.purchasePack.size,'количество в упаковке');
                const hasUnitPrice=l.purchasePack.pricePerUnit!==undefined&&l.purchasePack.pricePerUnit!==null&&l.purchasePack.pricePerUnit!=='';
                const pricePerUnit=hasUnitPrice?num(l.purchasePack.pricePerUnit,'цену за штуку',true):null;
                const price=hasUnitPrice?money(pricePerUnit*size):num(l.purchasePack.price,'цену упаковки',true);
                if(!hasUnitPrice&&Math.abs(price-money(price))>1e-8)throw ApiError.badRequest('Цена упаковки — до двух знаков после запятой');
                const unitPrice=hasUnitPrice?pricePerUnit:round(price/size);
                const quantity=num(count*size,'общее количество');
                const packUnit=l.purchasePack.unit==null||l.purchasePack.unit===''?'коробка':text(l.purchasePack.unit,'единицу упаковки').slice(0,32);
                const lineTotal=hasUnitPrice?money(quantity*unitPrice):money(count*price);
                return {materialId,quantity,unitCost:unitPrice,lineTotal,purchasePack:{count,size,price,pricePerUnit:unitPrice,unit:packUnit},boxCount:count,unitsPerBox:size,pricePerUnit:unitPrice,packUnit,shortageReason,shortageComment};
            }
            const quantity=num(l.quantity,'количество'),unitCost=num(l.unitCost,'цена',true);
            return {materialId,quantity,unitCost,lineTotal:money(quantity*unitCost),shortageReason,shortageComment};
        }).sort((a,b)=>a.materialId.localeCompare(b.materialId));
        if (new Set(lines.map(l => l.materialId)).size !== lines.length) throw ApiError.badRequest('Один материал указан несколько раз');
        if (b.paid !== undefined && typeof b.paid !== 'boolean') throw ApiError.badRequest('Укажите, оплачен ли приход');
        if(b.initialPayment&&b.paid)throw ApiError.badRequest('Укажите оплату одним способом');
        const costs=require('./receiptCostService')(lines,b);
        return {lines,costs,total:money(lines.reduce((sum,l)=>sum+l.lineTotal,0))};
};
