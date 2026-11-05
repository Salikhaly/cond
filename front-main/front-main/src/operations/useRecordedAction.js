import {useEffect} from 'react';
import {api} from './api';
import {readCache,queued} from './offline';
import usePendingAction,{operationId} from './usePendingAction';

// Persist before sending. A timeout always resumes the same operation, never a new one.
export default function useRecordedAction({name,path,method='POST',data,run,onSaved,message='Записано'}){
 const [pending,setPending,stored]=usePendingAction(name);
 const finish=async(result,body)=>{await onSaved(result,body);setPending(null);};
 useEffect(()=>{let active=true;if(pending?.attempted)readCache(localStorage.getItem('cond-owner')+':result:'+pending.id).then(result=>{if(active&&result)run(()=>finish(result,pending.body),message);}).catch(()=>{});return()=>{active=false;};},[data,pending?.id]);
 const send=prepared=>run(async()=>{
  const operation={...prepared,attempted:true};
  if(!setPending(operation))throw Error('Не удалось сохранить номер операции. Запись не отправлена.');
  let result;
  try{result=await api(path,operation.body,method,operation.id);}
  catch(e){if(e.queued)setPending({...operation,rejected:true,error:e.message});else if(!e.network)setPending(null);throw e;}
  await finish(result,operation.body);
 },message);
 useEffect(()=>{if(!pending?.rejected)return;let active=true;const check=async()=>{const result=await readCache(localStorage.getItem('cond-owner')+':result:'+pending.id);if(!active)return;if(result)return run(()=>finish(result,pending.body),message);if(!(await queued()).some(r=>r.id===pending.id)&&active)setPending(null);};const timer=setInterval(()=>check().catch(()=>{}),1200);return()=>{active=false;clearInterval(timer);};},[pending?.id,pending?.rejected]);
 return {pending,stored,save:body=>send({id:operationId(),body}),retry:()=>send(pending)};
}
