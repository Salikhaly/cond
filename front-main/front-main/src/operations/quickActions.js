function quickActions(role,section,allowed,canViewTasks){
 let actions=[];
 if(role==='employee')actions=[['+ Выпуск','production',{kind:'add'}],...(canViewTasks?[['Что готовить','production',{kind:'production-tasks'}]]:[]),['Моя зарплата','payroll']];
 else if(role==='representative'&&section==='payroll')actions=[['Мои заявки','orders',{kind:'filter',status:'history'}],['Мои магазины','shops']];
 else if(role==='super_admin')actions=({
  production:[['+ Выпуск','production',{kind:'add'}],['Заявки','orders'],['Товары','catalog']],
  payroll:[['Табель','payroll',{kind:'timesheet'}],['Выплаты','payroll',{kind:'payments'}]],
  finance:[['Аналитика','finance',{kind:'analytics'}],['Расход','expenses',{kind:'add'}]],

 })[section]||[];
 return actions.filter(([,target])=>allowed.includes(target));
}
module.exports={quickActions};
