import React from 'react';
import {salesSeries,chartPoints} from './studioMetrics';
import {moneyFmt} from './api';
export default function MiniSalesChart({rows,from,to}){
 const series=salesSeries(rows,from,to),{points,baseline}=chartPoints(series),line=points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' '),area=points.length?line+' L'+points[points.length-1].x+','+baseline+' L'+points[0].x+','+baseline+' Z':'';
 return <svg viewBox="0 0 300 68" className="studio-mini-chart" role="img" aria-label={'Продажи по датам: '+(series.length?series.map(s=>s.date+' '+moneyFmt(s.value)+' ₸').join('; '):'нет данных')}><path d={'M8,'+baseline+' H292'} stroke="currentColor" strokeOpacity=".18" strokeDasharray="3 5" fill="none"/>{area&&<path d={area} fill="currentColor" fillOpacity=".1"/>}{line&&<path d={line} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}{points.length>0&&<circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="3.5" fill="#ffcd8b"/>}</svg>;
}
