const M=require('../models/operations');
function resolve(manual,link){const d=link?.data||link;return d&&Number(manual.manualCostVersion)===Number(d.primaryManualVersion)?{...manual,...d.sourceManual}:manual;}
async function get(productId,packId,t){const manual=await require('./manualCostService').get(productId,t),link=packId?await M.LegacyLink.findByPk('family-pack:'+packId,{transaction:t}):null;return resolve(manual,link);}
module.exports={get,resolve};
