const day = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/** Publication age, never a claim that stock or price was checked again. */
export function offerFreshness(value, now = Date.now()) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return null;
  const elapsed = now - timestamp;
  if (elapsed < -60_000) return null;
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return 'Publicada ahora';
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  if (day(new Date(timestamp)) === day(new Date(now))) {
    const hours = Math.floor(minutes / 60);
    return `Hoy · hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  // Calendar days in Madrid, including the spring/autumn clock changes.
  const calendar = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (type) => Number(parts.find((item) => item.type === type)?.value);
    return Date.UTC(part('year'), part('month') - 1, part('day'));
  };
  const days = Math.round((calendar(new Date(now)) - calendar(new Date(timestamp))) / 86_400_000);
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
