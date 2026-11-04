function groupSalesCatalog(items){
 const groups=new Map();
 for(const item of items){if(!groups.has(item.id))groups.set(item.id,[]);groups.get(item.id).push(item);}
 return [...groups.values()];
}
module.exports={groupSalesCatalog};
