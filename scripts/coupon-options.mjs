/** Only explicit separators denote alternatives; never infer that codes stack. */
export function isCollectableCoupon(value = '') {
  return /\b(?:recoge|recoger|recogida|activa|activar)\b[\s\S]*(?:ficha|cup[oó]n|pagar)|cup[oó]n[\s\S]*\b(?:recoge|recoger|activar)\b/iu.test(String(value));
}

export function couponOptions(value = '') {
  const entries = String(value).split(/\s*[/|;,\n]\s*/u).map(s => s.trim()).filter(Boolean);
  const cashback = entries.filter(s => /cash\s*back|reembolso/iu.test(s));
  const codes = [...new Set(entries.filter(s => !/cash\s*back|reembolso/iu.test(s) && !isCollectableCoupon(s)))];
  return { codes, cashback };
}
