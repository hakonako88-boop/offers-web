export function seasonalBanners(now = new Date()) {
 const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const items=[];
 if(day>='2026-10-27' && day<='2026-11-30') items.push({id:'black-friday',href:'/black-friday-2026/',eyebrow:day<'2026-11-27'?'PREPARA TU LISTA':'ESPECIAL DE COMPRAS',title:day==='2026-11-30'?'Cyber Monday':'Black Friday',date:'27 noviembre · Cyber Monday, 30 noviembre',description:'Compara antes. Compra con criterio.',cta:'Ver guía y ofertas',art:'BLACK\nFRIDAY'});
 if(day>='2026-11-01' && day<='2026-11-18') items.push({id:'aliexpress-1111',href:'/publicacion/aliexpress-11-11-2026-cupones-ofertas/',eyebrow:'ALIEXPRESS · ESPECIAL 11.11',title:'El 11.11 se vive aquí.',date:'Del 1 al 18 de noviembre',description:'Cupones, ofertas y condiciones claras.',cta:'Ver ofertas y cupones',art:'11.11'});
 return items;
}
