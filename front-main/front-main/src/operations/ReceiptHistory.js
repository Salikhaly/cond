import React,{useState,useEffect} from 'react';
import {Field,Empty} from './Fields';
import {fmt,moneyFmt} from './api';
import {receiptCurrent} from './receiptCurrent';
import ReceiptCorrection from './ReceiptCorrection';
import {newestReceipts} from './repeatReceipt';
import BackToReport from './BackToReport';

export default function ReceiptHistory({data,run,busy,documentId,onSelect,onPaySupplier,action,onNavigate}){
 const [search,setSearch]=useState(''),[editing,setEditing]=useState(false);
 useEffect(()=>setEditing(false),[documentId]);
 const materials=[...(data.materials||[]),...(data.archivedMaterials||[])];
 const source=(data.receiptDocuments||[]).find(r=>r.id===documentId);
 const rows=(data.receiptDocuments||[]).map(r=>receiptCurrent(r,data.receiptCorrections));
 const receipt=source&&receiptCurrent(source,data.receiptCorrections);
 const canCorrect=data.permissions?.materials!==false&&data.permissions?.adjustFinance!==false;
 if(receipt&&editing)return <ReceiptCorrection key={source.id+':'+(receipt.revisions[0]?.version||0)} receipt={source} data={data} run={run} busy={busy} onBack={()=>setEditing(false)} onDone={()=>setEditing(false)}/>;
 const lines=items=>items.map((l,i)=>{const material=materials.find(m=>m.id===l.materialId);return <div className="cond-receipt-line" key={i}><span><b>{material?.name||'Материал из истории'}</b><small>{Number(l.quantity)>0?fmt(l.quantity)+' '+(material?.unit||'ед.'):'Количество не указано'}{l.shortageReason?' · '+l.shortageReason:''}</small></span><b>{moneyFmt(l.lineTotal??Number(l.quantity)*Number(l.unitCost))} ₸</b></div>;});
 const paidFor=r=>Number(data.receiptPaidAmounts?.[r.id]??(r.paid?r.total:0));
 return <section className="op-card"><BackToReport action={action} onNavigate={onNavigate}/>{documentId&&<button className="ghost" onClick={()=>onSelect(null)}>← Все приходы</button>}<h2>{receipt?'Приход '+receipt.document:'Приходы'}</h2>
 {documentId&&!source?(busy?<p className="op-muted">Загружаем приход…</p>:<Empty>Документ не найден. Вернитесь к списку приходов.</Empty>):receipt?<>
 <p>{receipt.supplier} · {receipt.date}</p><div className="op-simple-result"><div><span>Сумма прихода</span><strong>{moneyFmt(receipt.total)} ₸</strong></div></div>
 {lines(receipt.lines)}<div className="cond-receipt-line"><span>Оплачено / зачтено</span><b>{moneyFmt(paidFor(receipt))} ₸</b></div><div className="cond-receipt-line"><span>Осталось поставщику</span><b>{moneyFmt(Math.max(0,Number(receipt.total)-paidFor(receipt)))} ₸</b></div>
 <div className="op-actions">{canCorrect&&!receipt.lines.some(l=>l.historical)&&<button className="secondary" disabled={busy} onClick={()=>setEditing(true)}>Изменить приход</button>}{Number(receipt.total)-paidFor(receipt)>.005&&onPaySupplier&&data.permissions?.cash!==false&&<button disabled={busy} onClick={()=>onPaySupplier(receipt.id)}>Записать оплату</button>}</div>
 {!!receipt.revisions.length&&<details className="op-help"><summary>История исправлений · {receipt.revisions.length}</summary>{receipt.revisions.map(c=><article key={c.id} className="cond-document"><b>{c.date} · {c.actorName}</b><p>{c.reason}</p><span>{moneyFmt(c.before.total)} → {moneyFmt(c.after.total)} ₸</span></article>)}<h3>Исходный приход</h3><p>{moneyFmt(source.total)} ₸</p>{lines(source.lines)}</details>}
 {receipt.lines.some(l=>l.historical)&&<p className="op-field-hint">Архивный документ. Сегодняшний склад изменяется через ревизию.</p>}
 </>:<><Field label="Найти приход" type="search" placeholder="Поставщик или накладная" value={search} onChange={e=>setSearch(e.target.value)}/>{rows.length?newestReceipts(rows.filter(r=>[r.supplier,r.document,r.date].join(' ').toLowerCase().includes(search.toLowerCase()))).map(r=><button className="cond-repeat-receipt" key={r.id} onClick={()=>onSelect(r.id)}><span><b>{r.supplier}</b><small>{r.document} · {r.date}</small><small>{paidFor(r)>=Number(r.total)?'Оплачено':'Осталось '+moneyFmt(Number(r.total)-paidFor(r))+' ₸'}{r.revisions.length?' · Исправлен':''}</small></span><b>{moneyFmt(r.total)} ₸ →</b></button>):<Empty>Приходов пока нет.</Empty>}</>}
 </section>;
}
