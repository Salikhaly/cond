const ApiError=require('../exceptions/ApiError');
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const today=()=>process.env.COND_TEST_TODAY&&/^cond_.*test_/.test(process.env.DB_NAME||'')?process.env.COND_TEST_TODAY:day(new Date());
function date(v){if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw ApiError.badRequest('Проверьте дату');return v;}
function bounds(v){date(v);const start=new Date(v+'T00:00:00+05:00');return {start,end:new Date(start.getTime()+86400000)};}
module.exports={day,today,date,bounds};
