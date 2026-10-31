const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100,round=n=>Math.round(Number(n)*10000)/10000;
const key=s=>String(s||'').trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ');
const personKey=s=>key(s).replace(/[әұүқңғіө]/g,c=>({'ә':'а','ұ':'у','ү':'у','қ':'к','ң':'н','ғ':'г','і':'и','ө':'о'})[c]);
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function plan(source){
 const products=new Map(),workers=new Map(),acts=[],sales=new Map(),reviews=[];
 const product=(name,weight=1,unit='кг',sellable=true)=>{const id=key(name)+'|'+weight+'|'+unit;if(!products.has(id))products.set(id,{key:id,name,weight,unit,sellable});else if(sellable)products.get(id).sellable=true;return id;};
 const worker=name=>{const id=personKey(name);if(!workers.has(id))workers.set(id,{key:id,name});return id;};
 for(const sheetName of ['Ардак','Жанс ард','акбота','Назарбек','Жасулан','Ернур']){
  const sheet=source.sheets.find(s=>s.name===sheetName);if(!sheet)continue;const person=worker(sheetName);
  for(const row of sheet.rows){const cells=row.cells,name=cells.B?.cached,weight=cells.C?.cached;if(typeof name!=='string'||!(weight>0)||row.row<3||row.row>48)continue;const rate=sheet.rows.find(r=>r.row===(row.row<26?18:49))?.cells.AK?.cached;if(!(typeof rate==='number'&&rate>=0))continue;const id=product(name,weight);
   for(let d=1;d<=28;d++){const count=cells[col(d+2)]?.cached;if(typeof count==='number'&&count>0)acts.push({key:sheetName+':'+row.row+':'+d,worker:person,product:id,date:'2025-02-'+String(d).padStart(2,'0'),kg:round(count*weight),rate,labor:money(count*weight*rate),source:{sheet:sheetName,row:row.row,column:col(d+2)}});}
  }
 }
 const waffles=source.sheets.find(s=>s.name==='вафли');
 for(const row of waffles?.rows||[]){if(![3,4,5,6,13,14,15,16].includes(row.row))continue;const name=row.cells.B?.cached,rate=row.cells.AK?.cached;if(typeof name!=='string'||!(rate>0))continue;const person=worker(name),id=product('Вафли · выработка по ставке '+rate,1,'кг',false);for(let d=1;d<=28;d++){const kg=row.cells[col(d+2)]?.cached;if(typeof kg==='number'&&kg>0)acts.push({key:'вафли:'+row.row+':'+d,worker:person,product:id,date:'2025-02-'+String(d).padStart(2,'0'),kg:round(kg),rate,labor:money(kg*rate),source:{sheet:'вафли',row:row.row,column:col(d+2)}});}}
 for(const row of source.records.filter(r=>r.kind==='sale')){const id=product(row.name,row.factor,row.unit),groupKey=key(row.party)+'|'+row.date;if(!sales.has(groupKey))sales.set(groupKey,{key:groupKey,party:row.party,date:row.date,lines:[],total:0,paid:false});const group=sales.get(groupKey);group.lines.push({...row,product:id});group.total=money(group.total+row.amount);if(key(row.paymentNote)==='опл')group.paid=true;}
 const staffNames=['Айжанар апай','Бекзат','Карина','Жансая'];for(const name of staffNames)worker(name);
 const nonSuppliers=new Set(['мен','расходы','аванс','айлык','т4 бусик','т5 бусик','цех ремонт','септик']);
 const expenses=source.records.filter(r=>r.kind==='expense').map(row=>{const person=workers.get(personKey(row.name)),payroll=['аванс','айлык'].includes(key(row.party))&&person;return {...row,worker:payroll?person.key:null,kind:payroll?'payroll':!nonSuppliers.has(key(row.party))&&key(row.party)!==key(row.name)?'inventory':'unknown'};});
 const summary=source.sheets.find(s=>s.name==='печенье итого')?.rows.find(r=>r.row===55)?.cells.AL?.cached,individual=acts.filter(a=>a.source.sheet!=='вафли').reduce((s,a)=>s+a.labor,0);
 if(typeof summary==='number'&&Math.abs(summary-individual)>.02)reviews.push({name:'Сводный лист печенья',sourceAmount:money(summary),detailAmount:money(individual),difference:money(summary-individual),reason:'Сводка не совпадает с индивидуальными листами. Повторно не начислена.'});
 const namedSheets=source.sheets.filter(s=>!['продажа','расходы'].includes(s.name)).map(s=>({name:s.name,handled:['Ардак','Жанс ард','акбота','Назарбек','Жасулан','Ернур','вафли'].includes(s.name)?'Выработка и начисления':['Лист1','Лист2','печенье итого'].includes(s.name)?'Сводка: повторные строки не создаются':s.name==='адал'?'Начальный долг 210 000 ₸':'Справочник / пустые строки: без повторных движений'}));
 return {products:[...products.values()],workers:[...workers.values()],acts,sales:[...sales.values()],expenses,reviews,sheets:namedSheets};
}
module.exports={plan,key,personKey};
