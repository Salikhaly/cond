export function notificationLink(search, role) {
    const params=new URLSearchParams(search), section=params.get('section'), id=params.get('document');
    if(role!=='super_admin'||!['overview','orders','production'].includes(section))return null;
    const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'');
    return {section,intent:validId&&section!=='overview'?{kind:section==='orders'?'order':'production-document',id}:null};
}
