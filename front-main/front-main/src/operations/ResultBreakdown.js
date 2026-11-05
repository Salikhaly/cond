import React,{useState,useRef,useEffect} from 'react';
import {resultRows} from './resultRows';
import {moneyFmt,fmt} from './api';
import {Empty} from './Fields';
const labels={sales:'Продажи',cost:'Себестоимость продаж',operating:'Текущие расходы',result:'Результат бизнеса'};
export default function ResultBreakdown({data,from,to,kind,withCounts,onBack,onNavigate}){
 const [source,setSource]=useState(null),top=useRef(null);
 useEffect(()=>{top.current?.scrollIntoView({block:'start'});},[kind,source]);
 const {rows,financial:f}=resultRows(data,from,to,kind,withCounts);
 if(source)return <section ref={top} className="op-card"><button className="ghost" onClick={()=>setSource(null)}>← К списку</button><h2>Историческая запись</h2><p>{source.title}</p><strong className="op-expense-amount">{moneyFmt(source.amount)} ₸</strong><p>{source.date} · {source.note}</p>{source.source?.kg!=null&&<p>{fmt(source.source.kg)} кг</p>}<small className="op-muted">Это сохранённая запись учёта. Связанный документ в новом модуле отсутствует.</small></section>;
 return <section ref={top} className="op-card"><button className="ghost" onClick={onBack}>← К результату</button><h2>{labels[kind]}</h2><p className="op-muted">{from||'Начало учёта'} — {to||'Сегодня'}</p>
  {kind==='result'&&!f.complete&&<div className="ux-result-gaps"><b>Для точного результата нужны данные</b>{!f.margin.complete&&<p>Нет сохранённой стоимости у {f.margin.unknownRows} строк продаж и возвратов. Ниже можно открыть их документы. Текущая калькуляция не переписывает прошлые отгрузки.</p>}{f.expenses.unknown.length>0&&<button className="secondary" onClick={()=>onNavigate('expenses',{kind:'review',from,to})}>Выбрать статьи расходов · {f.expenses.unknown.length} →</button>}{f.payrollPending.map(r=><button className="secondary" key={r.id} onClick={()=>onNavigate('payroll',{kind:'work-day',userId:r.userId,date:r.date})}>Проверить начисление · {r.date} →</button>)}{f.payrollUnallocated.length>0&&<p>Начальная зарплата не распределена по документам. Известные суммы показаны ниже.</p>}{f.overheadReview&&<p>В выпусках есть накладные затраты и отдельно записаны текущие расходы. Нужно сверить, какие затраты включены в состав, чтобы не посчитать их дважды.</p>}{!f.margin.scrapComplete&&<p>Стоимость части списанных возвратов неизвестна.</p>}{withCounts&&!f.counts.complete&&<p>Пересчёты приняты. Для части изменений нет денежной оценки.</p>}</div>}
  <div className="ux-report-records">{rows.map(r=><button className="ux-report-record" key={r.id} onClick={()=>r.target&&onNavigate?onNavigate(r.target.section,{...r.target.action,returnReport:{kind:'report-period',from,to,view:'summary',detail:kind,withCounts}}):setSource(r)}><span><b>{r.title}</b><small>{r.date} · {r.note}</small>{!r.complete&&<small>Известная часть{r.unknownKg>0?' · без оценки '+fmt(r.unknownKg)+' кг':''}</small>}</span><strong>{moneyFmt(r.amount)} ₸</strong></button>)}</div>{!rows.length&&<Empty>За выбранный период записей нет.</Empty>}
 </section>;
}
