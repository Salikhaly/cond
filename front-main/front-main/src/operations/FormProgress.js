import React from 'react';
import Icon from './Icon';
export default function FormProgress({steps,current}){return <ol className="studio-form-progress" aria-label="Заполнение формы">{steps.map((label,i)=><li key={label} className={i<current?'complete':i===current?'current':''} aria-current={i===current?'step':undefined}><span>{i<current?<Icon name="check" size={13}/>:i+1}</span>{label}</li>)}</ol>;}
