function selectFilm(pack,materials){
 const films=materials.filter(m=>m.kind==='film'&&m.active!==false&&m.unit==='м');
 return pack.filmMaterialId?films.find(m=>String(m.id)===String(pack.filmMaterialId))||null:films.length===1?films[0]:null;
}
module.exports={selectFilm};
