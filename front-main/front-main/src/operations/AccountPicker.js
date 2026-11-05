import React from 'react';
const methods={cash:'Наличные',kaspi:'Карта / Kaspi',bank:'Банк'};
export default function AccountPicker({method,onChange,label='Способ оплаты'}){return <div className="cond-account-picker"><p className="op-field-hint">{label}</p><div className="cond-account-options">{Object.entries(methods).map(([id,name])=><button type="button" key={id} aria-pressed={(method||'cash')===id} className={(method||'cash')===id?'selected':''} onClick={()=>onChange('',id)}>{name}</button>)}</div></div>;}
