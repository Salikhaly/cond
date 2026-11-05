function quickActions(role,section,allowed,canViewTasks){
 let actions=[];
 if(role==='employee')actions=[['+ Выпуск','production',{kind:'add'}],...(canViewTasks?[['Что готовить','production',{kind:'production-tasks'}]]:[]),['Моя зарплата','payroll']];
 else if(role==='representative'&&section==='payroll')actions=[['Мои заявки','orders',{kind:'filter',status:'history'}],['Мои магазины','shops']];
 return actions.filter(([,target])=>allowed.includes(target));
}
module.exports={quickActions};
