function groupSalesCatalog(items){
 const groups=new Map();
 for(const item of items){const name=item.name.replace(/\s+\d+(?:[.,]\d+)?\s*кг.*$/iu,'').trim(),key=name.toLocaleLowerCase('ru').replace(/ё/g,'е');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...item,name});}
 return [...groups.values()];
}
module.exports={groupSalesCatalog};
