'use client';
import { useEffect, useState } from 'react';
import { freshTeslaPrice, teslaCoupon } from '../../scripts/tesla-pricing.mjs';
import CouponCopy from '../components/CouponCopy';
type Observation = { listedPrice: number | null; currency: string; checkedAt: string; coupon: unknown };
const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
export default function TeslaPrice({ observation, renderedAt }: { observation?: Observation; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick, 60000); return () => clearInterval(timer); }, []);
  const fresh = freshTeslaPrice(observation, now);
  const coupon = teslaCoupon(observation, now);
  return <div className="teslaPriceBlock" data-nosnippet>
    {fresh && observation ? <><p className="teslaLivePrice"><span>Desde</span><strong>{money(observation.listedPrice!)}</strong></p><small>Precio de producto consultado en la API. Varía según variante; envío e impuestos pendientes de confirmar.</small><time dateTime={observation.checkedAt}>Consultado {new Date(observation.checkedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (Madrid)</time></> : <p className="teslaPriceUnavailable">Consulta el importe actual en la tienda. No mostramos una cifra sin una comprobación reciente.</p>}
    {coupon && <div className="teslaCoupon"><strong>Descuento comunicado por la tienda: {money(coupon.amount)}</strong><p>Compra mínima comunicada: {money(coupon.minimum)}. Confirma producto elegible y total en la cesta; no está descontado del precio mostrado.</p><CouponCopy code={coupon.code} compact /><small>Fin comunicado: {coupon.end}. Horario de la plataforma; sujeto a cupos y condiciones.</small></div>}
    {fresh && !coupon && <small>Sin cupón aplicable confirmado por la API en esta consulta. No se aplican códigos genéricos por suposición.</small>}
  </div>;
}
