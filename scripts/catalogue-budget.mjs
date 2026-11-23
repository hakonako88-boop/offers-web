export function readBudget(input) {
  const value = input.trim().replace(/\s*€$/u,'').trim();
  if (!input.trim()) return {valid:true,amount:null};
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/u.test(value);
  if (!grouped && !/^\d+(?:[.,]\d{1,2})?$/u.test(value)) return {valid:false,amount:null};
  const amount = Number((grouped ? value.replaceAll('.','') : value).replace(',','.'));
  return {valid:Number.isFinite(amount),amount};
}
