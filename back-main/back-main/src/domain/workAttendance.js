const statuses=['worked','off','sick','vacation','absent'];
const labels={worked:'Работал',off:'Выходной',sick:'Больничный',vacation:'Отпуск',absent:'Не вышел'};
const pending=row=>row?.status==='reported'||String(row?.status||'').startsWith('reported_');
function attendance(row){
 let status=pending(row)?row.status==='reported'?'worked':row.status.slice(9):row?.status;
 if(status==='off'){
  const note=String(row.comment||'').toLowerCase();
  if(note.includes('больнич'))status='sick';else if(note.includes('отпуск'))status='vacation';else if(note.includes('не вышел')||note.includes('прогул'))status='absent';
 }
 return statuses.includes(status)?status:null;
}
module.exports={statuses,labels,pending,attendance};
