"use client";
import { useState, type ReactNode } from 'react';
export default function ResponsiveHighlights({children, total}: {children:ReactNode; total:number}) {
  const [expanded,setExpanded]=useState(false);
  return <><div id="highlighted-products" className={`featuredSelectionGrid${expanded ? ' highlightsExpanded' : ''}`}>{children}</div>{total>2 && <button className="moreHighlights" type="button" aria-expanded={expanded} aria-controls="highlighted-products" onClick={()=>setExpanded(value=>!value)}>{expanded ? 'Mostrar menos' : `Ver ${total-2} destacados más`}</button>}</>;
}
