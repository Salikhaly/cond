const {LegacyLink}=require('../models/operations'),ApiError=require('../exceptions/ApiError');
const key=id=>'product-manual-cost:'+id;
const defaults=()=>({manualCostEnabled:process.env.COND_MANUAL_COST_DEFAULT==='true',manualCostPerKg:null,manualCostVersion:0});
function view(row,defaultEnabled=defaults().manualCostEnabled){const d={manualCostEnabled:defaultEnabled},value=row?.data||{};return {manualCostEnabled:value.manualCostEnabled??d.manualCostEnabled,manualCostPerKg:value.manualCostPerKg??null,manualCostVersion:Number(value.manualCostVersion||0)};}
async function get(id,transaction){return view(await LegacyLink.findByPk(key(id),{transaction}));}
async function save(user,id,b,transaction){
 if(b.manualCostEnabled===undefined&&b.manualCostPerKg===undefined)return get(id,transaction);
 if(user.role!=='super_admin')throw ApiError.forbiddenRequest();
 const current=await get(id,transaction),value={...current};
 if(b.expectedManualCostVersion!==undefined&&Number(b.expectedManualCostVersion)!==current.manualCostVersion)throw new ApiError(409,'Стоимость уже изменена. Откройте карточку товара заново');
 if(b.manualCostEnabled!==undefined){if(typeof b.manualCostEnabled!=='boolean')throw ApiError.badRequest('Выберите способ расчёта себестоимости');value.manualCostEnabled=b.manualCostEnabled;}
 if(b.manualCostPerKg!==undefined){
  if(b.manualCostPerKg===null||b.manualCostPerKg==='')value.manualCostPerKg=null;
  else{const n=Number(typeof b.manualCostPerKg==='string'?b.manualCostPerKg.trim().replace(',','.'):b.manualCostPerKg);if(!['number','string'].includes(typeof b.manualCostPerKg)||!String(b.manualCostPerKg).trim()||!Number.isFinite(n)||n<0||n>1e9||Math.abs(n-Math.round(n*10000)/10000)>1e-8)throw ApiError.badRequest('Укажите себестоимость за 1 кг');value.manualCostPerKg=n;}
 }
 value.manualCostVersion=current.manualCostVersion+1;
 await LegacyLink.upsert({id:key(id),data:{...value,actorId:user.id,updatedAt:new Date().toISOString()}},{transaction});return value;
}
module.exports={get,save,view};
