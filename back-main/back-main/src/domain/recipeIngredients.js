// Boxed production uses the shared packaging rule. Legacy recipe packaging
// remains in saved recipes/history, but cannot be consumed a second time.
function ingredientLines(recipe,materials){
 const kinds=new Map(materials.map(m=>[String(m.id),m.kind]));
 return (recipe?.lines||[]).filter(l=>!['box','film'].includes(kinds.get(String(l.materialId))));
}
module.exports={ingredientLines};
