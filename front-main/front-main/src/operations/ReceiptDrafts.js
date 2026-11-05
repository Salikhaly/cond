import React,{useState} from 'react';
import {moneyFmt} from './api';
import {Empty} from './Fields';
import useRecordedAction from './useRecordedAction';
import {receiptDraftTotal} from './receiptDraftTotal';
function DraftCard({draft:d,data,run,busy,onOpen}){
 const [removing,setRemoving]=useState(false);
 const record=useRecordedAction({name:'remove-receipt-draft:'+d.id,path:'/receipt-drafts/'+d.id,method:'PATCH',data,run,message:'Черновик удалён',onSaved:()=>setRemoving(false)});
 return <article className="op-product-list-card"><div className="op-section-heading"><div><h3>{d.payload.supplier||'Поставщик ещё не выбран'}</h3><p>{d.payload.date||'Дата не выбрана'} · {d.payload.document||'Без номера'} · {d.payload.lines.length} позиций</p></div><strong>{moneyFmt(receiptDraftTotal(d.payload))} ₸</strong></div>{record.pending?<div className="op-review-panel"><p>Удаление ожидает подтверждения. Проверим ту же запись.</p><button disabled={busy||!record.stored} onClick={record.retry}>Проверить удаление</button></div>:d.status==='draft'?removing?<div className="op-review-panel"><p>Удалить черновик? Склад и оплаты не изменятся.</p><div className="op-actions"><button className="danger" disabled={busy} onClick={()=>record.save({cancel:true,expectedUpdatedAt:d.updatedAt})}>Удалить черновик</button><button className="secondary" onClick={()=>setRemoving(false)}>Оставить</button></div></div>:<div className="op-actions"><button disabled={busy} onClick={()=>onOpen(d)}>Изменить</button><button className="ghost danger" disabled={busy} onClick={()=>setRemoving(true)}>Удалить</button></div>:<span className={'op-badge '+(d.status==='posted'?'posted':'cancelled')}>{d.status==='posted'?'Проведён':'Удалён'}</span>}<details className="op-help"><summary>Кто сохранил</summary><p>{d.actorName} · {new Date(d.createdAt).toLocaleString('ru-RU')}</p></details></article>;
}
export default function ReceiptDrafts({data,run,busy,onOpen}){
 const [archive,setArchive]=useState(false),rows=(data.receiptDrafts||[]).filter(d=>archive?d.status!=='draft':d.status==='draft');
 return <section className="op-card"><div className="op-section-heading"><h2>Черновики приходов</h2><button className="ghost" onClick={()=>setArchive(v=>!v)}>{archive?'Действующие':'История'}</button></div>{rows.map(d=><DraftCard key={d.id} draft={d} data={data} run={run} busy={busy} onOpen={onOpen}/>)}{!rows.length&&<Empty>{archive?'В истории пока нет записей':'Черновиков пока нет'}</Empty>}</section>;
}
