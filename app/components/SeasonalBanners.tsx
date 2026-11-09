"use client";
import {useEffect,useState} from 'react';
import {seasonalBanners} from '../../scripts/seasonal-banners.mjs';

export default function SeasonalBanners({renderedAt}:{renderedAt:number}) {
 const [now,setNow]=useState(renderedAt);
 useEffect(()=>{setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
 const items=seasonalBanners(new Date(now));
 if(!items.length) return null;
 return <section className="seasonalBanners shell" aria-label="Especiales de Black Friday y 11.11">
  {items.map(item=><a key={item.id} className={`seasonalBanner seasonalBanner--${item.id}`} href={item.href}>
   <div className="seasonalBannerCopy"><span className="seasonalBannerEyebrow">{item.eyebrow}</span><h2>{item.title}</h2><p className="seasonalBannerDate">{item.date}</p><p className="seasonalBannerDescription">{item.description}</p><span className="seasonalBannerCta">{item.cta}<span aria-hidden="true">↗</span></span></div>
   <span className="seasonalBannerArt" aria-hidden="true">{item.art}</span>
  </a>)}
 </section>;
}
