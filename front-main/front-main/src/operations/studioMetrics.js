function salesSeries(rows,from,to){
 const start=new Date(from+'T12:00:00Z'),end=new Date(to+'T12:00:00Z');if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<start)return [];
 const daily=(end-start)/86400000<=62,values=new Map();
 for(const d=new Date(start);d<=end;daily?d.setUTCDate(d.getUTCDate()+1):d.setUTCMonth(d.getUTCMonth()+1,1)){const key=d.toISOString().slice(0,daily?10:7);values.set(key,0);}
 for(const row of rows){if(row.date<from||row.date>to)continue;const key=String(row.date).slice(0,daily?10:7),cents=Math.round(Number(row.revenue)*100);if(Number.isFinite(cents))values.set(key,(values.get(key)||0)+cents);}
 return [...values].sort(([a],[b])=>a.localeCompare(b)).map(([date,cents])=>({date,value:cents/100}));
}
function chartPoints(series,width=300,height=68){const min=Math.min(0,...series.map(s=>s.value)),max=Math.max(0,...series.map(s=>s.value)),range=max-min||1,y=v=>Math.round((height-8-(v-min)/range*(height-16))*100)/100;return {baseline:y(0),points:series.map((s,i)=>({...s,x:Math.round((8+i/Math.max(1,series.length-1)*(width-16))*100)/100,y:y(s.value)}))};}
const normalize=s=>String(s||'').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
function actionCommands(nav,data={},query=''){
 const allowed=new Set(nav.map(n=>n[0])),needle=normalize(query),quick=[{key:'receive-payment',section:'shops',name:'Получить оплату',hint:'Уменьшить долг или внести аванс',icon:'money',intent:{kind:'receive-payment'},words:'касса наличные банк каспи kaspi деньги долг клиент'}, {key:'expense-new',section:'expenses',name:'Записать расход',hint:'Бизнес или личный',icon:'expense',intent:{kind:'add'},words:'оплата деньги траты бензин свет вода'}, {key:'receipt-new',section:'materials',name:'Принять сырьё',hint:'Приход на склад',icon:'materials',intent:{kind:'receipt'},words:'приход ингредиенты поставка закупка'}, {key:'production-new',section:'production',name:'Записать выпуск',hint:'Изготовленные кг',icon:'production',intent:{kind:'add'},words:'акт переработка производство выработка'}, {key:'order-new',section:'orders',name:'Собрать заказ',hint:'Товары и магазин',icon:'orders',intent:{kind:'catalog'},words:'новая заявка каталог отгрузка'}].filter(a=>allowed.has(a.section));
 const sections=nav.map(([id,,name])=>({key:'section-'+id,section:id,name,icon:id,hint:'Раздел',words:({payroll:'зп зарплата сотрудники аванс календарь',money:'касса наличные банк каспи kaspi перевод',recipes:'состав себестоимость калькуляция',inventory:'ревизия пересчет',shops:'клиенты магазины долги',directory:'категории подкатегории справочник',history:'эксель excel февраль 2025 история архив листы приходы расходы'})[id]||''}));
 const materials=needle&&allowed.has('materials')?(data.materials||[]).filter(m=>normalize(m.name).includes(needle)).slice(0,5).map(m=>({key:'material-'+m.id,section:'materials',icon:'box',name:m.name,hint:String(Number(m.quantity))+' '+m.unit+' на складе',intent:{kind:'search',query:m.name}})):[];
 const matches=a=>!needle||normalize(a.name+' '+a.hint+' '+(a.words||'')).includes(needle);
 return {quick:quick.filter(matches),sections:sections.filter(matches),materials};
}
module.exports={salesSeries,chartPoints,actionCommands};
