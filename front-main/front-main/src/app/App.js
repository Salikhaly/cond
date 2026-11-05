import React,{lazy,Suspense,useEffect,useState} from 'react';
import './styles/styles.css';
const Workspace=lazy(()=>import('../operations/Workspace'));
const Storefront=lazy(()=>import('../operations/Storefront'));
class ScreenBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div style={{padding:32,fontFamily:'-apple-system, sans-serif',maxWidth:500,margin:'auto'}} role="alert"><h1>Не удалось открыть экран</h1><p>Проверьте соединение и обновите страницу.</p><button onClick={()=>window.location.reload()} style={{padding:'14px 20px',border:0,borderRadius:14,background:'#236548',color:'white',fontSize:16}}>Обновить приложение</button></div>:this.props.children;}
}
export default function App(){
 const [hash,setHash]=useState(window.location.hash);
 useEffect(()=>{const update=()=>setHash(window.location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 const guest=hash.startsWith('#/shop/'),token=guest?hash.slice(7):'';
 return <ScreenBoundary><Suspense fallback={<div className="op-loading">Загружаем COND…</div>}>{guest?<Storefront key={token} token={token}/>:<Workspace/>}</Suspense></ScreenBoundary>;
}
