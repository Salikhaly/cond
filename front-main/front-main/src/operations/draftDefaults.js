// Only refresh the date of an empty operation; never move a real draft to another day.
function restoreDraft(name,saved,initial){
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return initial;
 const next={...initial,...saved};
 const empty=name==='simple-receipt'
  ?!(next.lines?.length||next.supplier||next.document||next.comment||next.note||next.serverDraftId||Number(next.additionalAmount))
  :name==='quick-expense-v2'
   ?!(next.amount||next.articleId||next.name||next.recipient||next.comment)
   :name==='production-boxes'?!(next.boxes||next.reason):false;
 if(empty&&initial.date)next.date=initial.date;
 return next;
}
module.exports={restoreDraft};
