import React from 'react';
import {salesSeries,chartPoints} from './studioMetrics';
import {day} from './overviewMetrics';
import {moneyFmt} from './api';
export default function SalesTrend({sales,from,to}){
 const rows=sales.map(s=>({date:day(s.date),revenue:Number(s.totalAmount)})),dates=rows.map(r=>r.date).sort();
 const series=salesSeries(rows,from||dates[0],to||dates[dates.length-1]),chart=chartPoints(series,300,100);
 if(!series.length)return null;
 return <section className="op-card ux-sales-trend"><h2>Динамика продаж</h2><svg viewBox="0 0 300 100" role="img" aria-label="Продажи после возвратов по датам"><line x1="8" y1={chart.baseline} x2="292" y2={chart.baseline} stroke="#dce5df"/><polyline points={chart.points.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="#277653" strokeWidth="2.5" strokeLinejoin="round"/>{chart.points.map(p=><circle key={p.date} cx={p.x} cy={p.y} r="2" fill={p.value<0?'#bb5344':'#277653'}><title>{p.date+' · '+moneyFmt(p.value)+' ₸'}</title></circle>)}</svg><div className="ux-trend-dates"><span>{series[0].date}</span><small>Дни без продаж — 0</small><span>{series[series.length-1].date}</span></div></section>;
}
