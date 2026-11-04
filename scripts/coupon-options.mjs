/** Only explicit separators denote alternatives; never infer that codes stack. */
export function couponOptions(value = '') {
  const entries = String(value).split(/\s*[/|;,\n]\s*/u).map(s => s.trim()).filter(Boolean);
  const cashback = entries.filter(s => /cash\s*back|reembolso/iu.test(s));
  const codes = [...new Set(entries.filter(s => !/cash\s*back|reembolso/iu.test(s)))];
  return { codes, cashback };
}
