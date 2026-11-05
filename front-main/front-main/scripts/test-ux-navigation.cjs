const assert=require('node:assert/strict');
const {restoreDraft}=require('../src/operations/draftDefaults'),{quickActions}=require('../src/operations/quickActions'),{groupSalesCatalog}=require('../src/operations/salesCatalog');
let n=0;const test=(label,fn)=>{fn();n++;console.log('PASS '+label);};
const today='2026-11-04',initial={date:today,lines:[],supplier:'',document:''};
test('A blank receipt stored last week opens with today, without losing defaults',()=>assert.equal(restoreDraft('simple-receipt',{...initial,date:'2026-10-30'},initial).date,today));
test('An unfinished supplier receipt keeps its original operation date',()=>assert.equal(restoreDraft('simple-receipt',{...initial,date:'2026-10-30',supplier:'Мука'},initial).date,'2026-10-30'));
test('A material line prevents silently redating a real receipt draft',()=>assert.equal(restoreDraft('simple-receipt',{...initial,date:'2026-10-30',lines:[{materialId:4,quantity:1}]},initial).date,'2026-10-30'));
test('A server draft cannot silently move to another day',()=>assert.equal(restoreDraft('simple-receipt',{...initial,date:'2026-10-30',serverDraftId:'draft'},initial).date,'2026-10-30'));
test('Remembered product selection is kept while an empty output starts today',()=>assert.deepEqual(restoreDraft('production-boxes',{date:'2026-10-30',productId:'7',boxes:''},{date:today,productId:'',boxes:''}),{date:today,productId:'7',boxes:''}));
test('Recorded output and expense drafts preserve original dates',()=>{assert.equal(restoreDraft('production-boxes',{date:'2026-10-30',boxes:'3'},{date:today}).date,'2026-10-30');assert.equal(restoreDraft('quick-expense-v2',{date:'2026-10-30',amount:'1000'},{date:today}).date,'2026-10-30');});
test('Invalid stored JSON values fall back to a usable initial form',()=>assert.deepEqual(restoreDraft('simple-receipt',[],initial),initial));
test('Employee actions stay within output and own payroll; tasks require permission',()=>{assert.ok(quickActions('employee','production',['production','payroll'],false).every(a=>['production','payroll'].includes(a[1])));assert.ok(!quickActions('employee','production',['production','payroll'],false).some(a=>a[2]?.kind==='production-tasks'));});
test('Owner uses native screen actions without a duplicate floating toolbar',()=>assert.deepEqual(quickActions('super_admin','production',['production'],false),[]));
test('Representative payroll has no finance, price administration or factory attendance shortcuts',()=>assert.deepEqual(quickActions('representative','payroll',['payroll','orders','shops'],false).map(a=>a[1]),['orders','shops']));
test('A catalogue and cart already have their own action; no second floating toolbar',()=>assert.deepEqual(quickActions('representative','orders',['orders','returns','shops'],false),[]));
test('Four sizes become one product card while preserving each package ID',()=>{const items=[1,2,3,4].map(id=>({id:7,name:'Печенье',pack:{id:'pack-'+id}}));const groups=groupSalesCatalog(items);assert.equal(groups.length,1);assert.deepEqual(groups[0].map(i=>i.pack.id),items.map(i=>i.pack.id));});
test('Products with the same name remain separate stock and order identities',()=>assert.equal(groupSalesCatalog([{id:7,name:'Печенье',pack:{id:'a'}},{id:8,name:'Печенье',pack:{id:'b'}}]).length,2));
test('Conditional screens still import every referenced React component',()=>{
 const fs=require('fs'),path=require('path'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
 for(const file of ['Orders.js','OrderProductCard.js','ProductCatalog.js','OwnerHomeSummary.js','Workspace.js']){
  const tree=parser.parse(fs.readFileSync(path.join(__dirname,'../src/operations',file),'utf8'),{sourceType:'module',plugins:['jsx']});
  traverse(tree,{JSXOpeningElement(p){const node=p.node.name,name=node.type==='JSXIdentifier'?node.name:node.type==='JSXMemberExpression'&&node.object.type==='JSXIdentifier'?node.object.name:null;if(name&&/^[A-Z]/.test(name))assert.ok(p.scope.hasBinding(name),file+': missing component '+name);}});
 }
});
const {attendanceLabel}=require('../src/operations/workCalendarMetrics');
test('Unmarked and future days are not called employee absences',()=>{assert.equal(attendanceLabel({date:'2026-11-03'},today),'Нет отметки');assert.equal(attendanceLabel({date:'2026-11-05'},today),'День ещё не наступил');});
test('A wage adjustment without output is not presented as confirmed attendance',()=>assert.equal(attendanceLabel({date:today,hasEarnings:true},today),'Есть начисление, выход не подтверждён'));
test('Actual work and a pending act retain their distinct labels',()=>{assert.equal(attendanceLabel({date:today,worked:true},today),'Работа подтверждена');assert.equal(attendanceLabel({date:today,pending:true},today),'На проверке');});

console.log(n+' UX navigation and draft checks passed');
