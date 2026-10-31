const db=require('../database/sequelize'),M=require('../models/operations'),ApiError=require('../exceptions/ApiError');
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest();};
function payload(b){if(!b||typeof b!=='object'||Array.isArray(b)||!Array.isArray(b.lines)||b.lines.length>100||JSON.stringify(b).length>500000)throw ApiError.badRequest('Проверьте черновик прихода');return b;}
async function create(u,b){admin(u);return M.ReceiptDraft.create({payload:payload(b.payload),actorId:u.id,actorName:u.name});}
async function change(u,id,b,post=false){
 admin(u);return db.transaction(async t=>{
  const d=await M.ReceiptDraft.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!d||d.status!=='draft')throw ApiError.badRequest('Доступен только непроведённый черновик');
  if(new Date(d.updatedAt).toISOString()!==b.expectedUpdatedAt)throw new ApiError(409,'Черновик изменён другим пользователем. Откройте актуальную версию');
  if(b.cancel===true&&!post)return d.update({status:'cancelled'},{transaction:t});
  const next=b.payload?payload(b.payload):d.payload;
  if(!post)return d.update({payload:next},{transaction:t});
  const receipt=await require('./operationsService').receipt(u,next,t);
  await d.update({payload:next,status:'posted',receiptId:receipt.id,postedBy:u.id,postedAt:new Date()},{transaction:t});return receipt;
 });
}
module.exports={create,update:(u,id,b)=>change(u,id,b),post:(u,id,b)=>change(u,id,b,true)};
