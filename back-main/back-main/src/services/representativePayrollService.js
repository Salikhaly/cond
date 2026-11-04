const {Op}=require('sequelize');
const {createHash}=require('crypto');
const db=require('../database/sequelize'),M=require('../models/operations');
const {User,Salary}=require('../models/models');
const ApiError=require('../exceptions/ApiError');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const admin=u=>{if(u.role!=='super_admin')throw ApiError.forbiddenRequest('Только администратор');};
function amount(v,label,negative=false){const n=Number(v);if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(n)||(!negative&&n<0)||Math.abs(n)>1e7||Math.abs(n*100-Math.round(n*100))>.00001)throw ApiError.badRequest('Проверьте '+label);return money(n);}
function monthOf(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit'}).format(new Date(d));}
async function calculation(b,t){
    const bounds=require('./payrollPeriod')(b.month),user=await User.findByPk(b.userId,{transaction:t});
    if(!user||!['employee','representative'].includes(user.role))throw ApiError.badRequest('Выберите сотрудника');
    if(!['shipments','payments','margin','profit'].includes(b.mode))throw ApiError.badRequest('Выберите базу процента');
    const fixed=amount(b.fixed,'оклад'),percent=amount(b.percent,'процент');
    if(percent>100)throw ApiError.badRequest('Процент должен быть от 0 до 100');
    const rule=await require('./workPolicyService').at(user.id,new Date(bounds.end.getTime()+5*3600000-86400000).toISOString().slice(0,10),t);if(rule&&rule.mode!=='monthly')throw ApiError.badRequest('У сотрудника действует ежедневное правило. Месячный расчёт поверх него не начисляется');
    if(user.role==='employee'&&(!rule||rule.mode!=='monthly'||percent!==0||fixed!==Number(rule.monthlySalary)))throw ApiError.badRequest('Оклад работника берётся из согласованных условий. Выберите месячный оклад, процент — 0');
    if(user.role==='employee'&&await M.Production.count({where:{workerId:user.id,status:'posted',date:{[Op.gte]:b.month+'-01',[Op.lt]:new Date(bounds.end.getTime()+5*3600000).toISOString().slice(0,10)},laborCost:{[Op.ne]:0}},transaction:t}))throw ApiError.badRequest('В месяце уже есть сдельные начисления. Согласуйте переход с нового месяца');
    if(rule?.mode==='monthly'&&fixed!==Number(rule.monthlySalary))throw ApiError.badRequest('Оклад отличается от согласованных условий. Сначала согласуйте изменение оклада');
    const orders=await M.Order.findAll({where:{userId:user.id,status:'shipped'},transaction:t});
    const periodOrders=orders.filter(o=>monthOf(o.shippedAt)===b.month);
    const returns=await M.GoodsReturn.findAll({where:{status:'posted',orderId:orders.map(o=>o.id),postedAt:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}},transaction:t});
    const sales=money(periodOrders.reduce((s,o)=>s+Number(o.total),0)),returned=money(returns.reduce((s,r)=>s+Number(r.total),0));
    const note=String(b.note||'').trim().slice(0,1000);
    if(b.mode==='profit'&&(!note||b.basisConfirmed!==true))throw ApiError.badRequest('Укажите основание и подтвердите фактическую прибыль');
    let basis,source;
    const saleSource={orders:periodOrders.map(o=>({id:o.id,total:Number(o.total)})).sort((a,b)=>a.id.localeCompare(b.id)),returns:returns.map(r=>({id:r.id,total:Number(r.total)})).sort((a,b)=>a.id.localeCompare(b.id))};
    if(b.mode==='shipments'){basis=money(sales-returned);source=saleSource;}
    if(b.mode==='margin'){
        const events=await M.CostEvent.findAll({where:{kind:{[Op.in]:['shipment','return-accepted']}},transaction:t}),costs=[];
        for(const o of periodOrders)for(const l of o.lines){const e=events.find(e=>e.id===`shipment:${o.id}:${l.productId}`);if(!e||Number(e.kg)-Number(e.knownKg)>.00011)throw ApiError.badRequest('Неизвестна себестоимость отгрузки. Процент от маржи пока не рассчитан');costs.push({id:e.id,value:Number(e.value)});}
        for(const r of returns)for(const l of r.lines){const e=events.find(e=>e.id===`return:${r.id}:${l.productId}`);if(!e||Number(e.kg)-Number(e.knownKg)>.00011)throw ApiError.badRequest('Неизвестна себестоимость возврата. Процент от маржи пока не рассчитан');costs.push({id:e.id,value:-Number(e.value)});}
        basis=money(sales-returned-costs.reduce((s,c)=>s+c.value,0));source={...saleSource,costs:costs.sort((a,b)=>a.id.localeCompare(b.id))};
    }
    if(b.mode==='payments'){
        const cash=await M.CashEntry.findAll({where:{kind:'trade',direction:'in',status:'posted',date:{[Op.gte]:b.month+'-01',[Op.lt]:new Date(bounds.end.getTime()+5*3600000).toISOString().slice(0,10)}},transaction:t});
        const allocations=await M.CashAllocation.findAll({where:{entryId:cash.map(e=>e.id),documentType:'order',documentId:orders.map(o=>o.id)},transaction:t});
        // Returns are selected by receipt month above; a later refund belongs to its own cash date.
        const allReturns=await M.GoodsReturn.findAll({where:{status:'posted',orderId:orders.map(o=>o.id)},transaction:t});
        const allRefunds=await M.ReturnSettlement.findAll({where:{kind:'refund',returnId:allReturns.map(r=>r.id),createdAt:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}},transaction:t});
        basis=money(allocations.reduce((s,a)=>s+Number(a.amount),0)-allRefunds.reduce((s,r)=>s+Number(r.amount),0));
        source={cash:cash.filter(e=>allocations.some(a=>a.entryId===e.id)).map(e=>({id:e.id,date:e.date})).sort((a,b)=>a.id.localeCompare(b.id)),allocations:allocations.map(a=>({id:a.id,orderId:a.documentId,amount:Number(a.amount)})).sort((a,b)=>a.id.localeCompare(b.id)),refunds:allRefunds.map(r=>({id:r.id,amount:Number(r.amount)})).sort((a,b)=>a.id.localeCompare(b.id))};
    }
    if(b.mode==='profit'){basis=amount(b.manualBasis,'фактическую базу процента',true);source={manual:true};}
    const bonus=money(basis*percent/100),total=money(fixed+bonus);
    if(Math.abs(total)>99999999.99)throw ApiError.badRequest('Сумма выходит за пределы зарплатного журнала');
    const latest=await M.RepAccrual.findOne({where:{userId:user.id,month:b.month},order:[['version','DESC']],transaction:t});
    const snapshot={userId:user.id,name:user.name,month:b.month,mode:b.mode,fixed,percent,basis,bonus,total,sales,returned,note,
        source,
        priorId:latest?.id||null,previousTotal:Number(latest?.snapshot.total||0)};
    return {...snapshot,delta:money(total-snapshot.previousTotal),fingerprint:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')};
}
async function preview(user,b){admin(user);if(b.mode==='profit')await require('./authorityService').owner(user);return db.transaction({isolationLevel:'REPEATABLE READ'},t=>calculation(b,t));}
async function post(user,b,transaction){
    admin(user);if(b.mode==='profit')await require('./authorityService').owner(user);
    const save=async t=>{
        const target=await User.findByPk(b.userId,{transaction:t,lock:t.LOCK.UPDATE});
        if(!target||!['employee','representative'].includes(target.role))throw ApiError.badRequest('Выберите сотрудника');
        const calc=await calculation(b,t);
        if(!b.fingerprint||b.fingerprint!==calc.fingerprint)throw new ApiError(409,'Расчёт изменился. Проверьте начисление заново');
        const latest=await M.RepAccrual.findOne({where:{userId:target.id,month:b.month},order:[['version','DESC']],transaction:t});
        const clean=c=>{const {priorId,previousTotal,delta,fingerprint,...rest}=c;return JSON.stringify(canonical(rest));};
        if(latest&&clean(latest.snapshot)===clean(calc))return latest;
        const bounds=require('./payrollPeriod')(b.month);
        let salary=await Salary.findOne({where:{userId:target.id,is_active:true,date:{[Op.gte]:bounds.start,[Op.lt]:bounds.end}},transaction:t,lock:t.LOCK.UPDATE});
        if(!salary)salary=await Salary.create({userId:target.id,total_amount:0,date:bounds.start},{transaction:t});
        await salary.increment('total_amount',{by:calc.delta,transaction:t});
        return M.RepAccrual.create({userId:target.id,month:b.month,version:(latest?.version||0)+1,snapshot:calc,delta:calc.delta,actorId:user.id,actorName:user.name},{transaction:t});
    };
    return transaction?save(transaction):db.transaction(save);
}
module.exports={preview,post,calculation};
