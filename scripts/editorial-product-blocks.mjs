/** Preserve exact product order, including historical records. Never substitute. */
export function editorialProductBlocks(post, deals) {
  const paragraphs=String(post.body||'').split(/\n{2,}/u);
  const intro=[], sections=[]; let current;
  for(const paragraph of paragraphs){
    const match=paragraph.match(/^(\d+)\.\s+(.+)$/u);
    if(match){current={number:Number(match[1]),title:match[2],paragraphs:[]};sections.push(current);}
    else if(current) current.paragraphs.push(paragraph);
    else intro.push(paragraph);
  }
  return {intro,sections:sections.map((section,index)=>{
    const identity=post.offerIds[index];
    return {...section,deal:identity ? deals.find(d=>d.sourceProductId===identity || d.id===identity) : undefined,
      image:post.imageUrls[index]||post.imageUrl,
      paragraphs:section.paragraphs.map(p=>p.replace(/Consulta la ficha enlazada al final del art[ií]culo[^.]*\./gu,'Consulta las condiciones en la ficha de este producto.'))};
  })};
}
