const M=require('../models/operations'),{Product,User}=require('../models/models'),{createHash}=require('crypto');
async function snapshot(req,result){
 const type=req.path.split('/')[1],id=type==='recipes'?(req.params.id??req.body.productId):(req.params.id??result?.id);
 const models={'expense-articles':M.ExpenseArticle,'money-accounts':M.MoneyAccount,'money-documents':M.MoneyDocument,'work-days':M.WorkDay,'wage-requests':M.WageRequest,'work-profiles':M.WorkProfile,authority:M.AccountAuthority,users:M.Access,products:Product,materials:M.Material,recipes:M.Recipe,suppliers:M.Supplier,outlets:M.Outlet,'receipt-drafts':M.ReceiptDraft,'stock-counts':M.StockCount,productions:M.Production,orders:M.Order,cash:M.CashEntry,payments:M.Payment,returns:M.GoodsReturn};
 let model=models[type],value=null;
 if(type==='money-links'&&req.body?.source){const row=await M.MoneyAssignment.findByPk(req.body.source);return {type,id:req.body.source,value:row?.toJSON()||null};}
 if(type==='orders'&&req.path.endsWith('/terms'))model=M.OrderTerms;
 if(model&&id){const row=type==='recipes'?await model.findOne({where:{productId:id}}):await model.findByPk(id);value=row?.toJSON()||null;}
 if(type==='work-days'&&!id&&typeof req.body?.date==='string'&&Number(req.user.role==='super_admin'?req.body?.userId:req.user.id)>0){require('./businessDay').date(req.body.date);const row=await M.WorkDay.findOne({where:{userId:req.user.role==='super_admin'?Number(req.body.userId):req.user.id,date:req.body.date}});value=row?.toJSON()||null;}
 if(type==='work-profiles'&&id){const person=await User.findByPk(id,{attributes:['name']});value={...(value||{}),name:person?.name||''};if(value.photo){value.photoHash=createHash('sha256').update(value.photo).digest('hex');delete value.photo;}}
 if(type==='products'&&value){
  const display=await M.ProductDisplay.findByPk(id);value.display=display?{description:display.description,photoHash:createHash('sha256').update(display.photo||'').digest('hex')}:null;
 }
 // Authentication records, password hashes and tokens never enter before/after snapshots.
 return {type,id:id==null?'':String(id),value};
}
async function record(req,before,result){
 const after=await snapshot(req,result);
 if(!before.value&&!after.value)return;
 await M.ChangeRecord.create({operationId:req.headers['x-operation-id'],entityType:after.type,entityId:after.id,before:before.value,after:after.value,reason:String(req.body?.reason||req.body?.note||'').slice(0,2000),actorId:req.user.id,actorName:req.user.name});
}
module.exports={snapshot,record};
