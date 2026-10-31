import React from 'react';
export default function ResultOptions({withCounts,withPersonal,onCounts,onPersonal}){
 return <div className="op-result-options" aria-label="Что учитывать в результате"><label className={withCounts?'selected':''}><input type="checkbox" checked={withCounts} onChange={e=>onCounts(e.target.checked)}/><span>С ревизиями</span></label><label className={'personal '+(withPersonal?'selected':'')}><input type="checkbox" checked={withPersonal} onChange={e=>onPersonal(e.target.checked)}/><span>С личными тратами</span></label></div>;
}
