const M=require('../models/operations'),ApiError=require('../exceptions/ApiError');
function validate(p){
 if(!p||!/^[a-f0-9]{64}$/.test(p.id)||!/^[a-f0-9]{64}$/.test(p.sourceHash)||!Array.isArray(p.records)||p.records.length>20000||!Array.isArray(p.sheets))throw Error('Invalid historical workbook');
 const keys=new Set(),counts={sale:0,expense:0},cents={sale:0,expense:0};
 for(const row of p.records){if(!['sale','expense'].includes(row.kind)||typeof row.key!=='string'||keys.has(row.key)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(row.amount)||typeof row.name!=='string'||!Number.isInteger(row.row))throw Error('Invalid historical row');keys.add(row.key);counts[row.kind]++;cents[row.kind]+=Math.round(row.amount*100);}
 for(const kind of ['sale','expense'])if(counts[kind]!==p.counts[kind]||cents[kind]!==Math.round(p.totals[kind]*100))throw Error('Historical totals do not reconcile');
 return p;
}
async function importWorkbook(payload,transaction){const p=validate(payload);const [batch,created]=await M.HistoryWorkbook.findOrCreate({where:{id:p.id},defaults:{name:p.name,period:p.period,sourceHash:p.sourceHash,payload:p},transaction});if(batch.sourceHash!==p.sourceHash&&JSON.stringify(batch.payload.records)!==JSON.stringify(p.records))throw Error('Historical import conflict');return {id:batch.id,created,counts:batch.payload.counts,totals:batch.payload.totals};}
async function read(user,query={}){
 await require('./authorityService').owner(user);
 const batches=await M.HistoryWorkbook.findAll({attributes:['id','name','period','createdAt'],order:[['period','DESC'],['id','ASC']],raw:true});
 if(!batches.length)return {batches,selected:null};
 const id=query.id||batches[0].id;if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw ApiError.badRequest('Выберите загруженный файл');
 const batch=await M.HistoryWorkbook.findByPk(id);if(!batch)throw ApiError.notFound();
 const {sheets,...data}=batch.payload;
 if(query.sheet){const sheet=sheets.find(s=>s.name===query.sheet);if(!sheet)throw ApiError.notFound();return {sheet};}
 return {batches,selected:{...data,importedAt:batch.createdAt,sheets:sheets.map(s=>({name:s.name,rowCount:s.rowCount,columnCount:s.columnCount}))}};
}
module.exports={validate,importWorkbook,read};
