import React,{useEffect,useRef,useState} from 'react';
import {normalizeNumber,numericError} from './numericValue';
// Text + decimal keyboard cannot increment when a finger or mouse scrolls.
export default function NumericInput({value,onChange,type,min,max,step='any',inputMode,...props}){
 const ref=useRef(null),[touched,setTouched]=useState(false),error=numericError(value,{min,max,step});
 useEffect(()=>{ref.current?.setCustomValidity(error);},[error,value]);
 return <><input {...props} ref={ref} type="text" data-numeric="true" inputMode={inputMode||(String(step)==='1'?'numeric':'decimal')} value={value??''} aria-invalid={error?'true':undefined} onBlur={e=>{setTouched(true);props.onBlur?.(e);}} onChange={e=>{const next=normalizeNumber(e.target.value);if(!/^-?[\d.]*$/.test(next)||(next.match(/\./g)||[]).length>1)return;e.target.value=next;e.target.setCustomValidity(numericError(next,{min,max,step}));onChange?.(e);}}/>{touched&&error&&<small className="cond-input-error" role="alert">{error}</small>}</>;
}
