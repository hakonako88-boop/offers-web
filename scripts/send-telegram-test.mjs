const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const statusFile = new URL('../data/telegram-test-status.json', import.meta.url);

const status = {
  checkedAt: new Date().toISOString(),
  configured: Boolean(token && channelId),
  sent: false,
};

function safeError(error) {
  return String(error?.message || error || 'Unknown error').replaceAll(token || '', '[redacted]');
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${response.status}`);
  }
  return data.result;
}

if (!token || !channelId) {
  status.error = 'Missing Telegram configuration.';
} else {
  try {
    const bot = await telegram('getMe', {});
    status.bot = bot.username ? `@${bot.username}` : 'configured';

    const membership = await telegram('getChatMember', {
      chat_id: channelId,
      user_id: bot.id,
    });
    status.membership = membership.status;
    status.canPostMessages = membership.can_post_messages !== false;

    const offers = JSON.parse(await readFile(new URL('../data/offers.json', import.meta.url), 'utf8'));
    const offer = offers.filter(item => item.title && item.price && item.url && String(item.image).startsWith('/tg/') && item.coupon).sort((a,b)=>Number(b.date)-Number(a.date))[0];
    if (!offer) throw new Error('No hay una oferta guardada con foto y cupón para probar sin inventar datos.');
    const amount = value => Number(String(value || '').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    const current = amount(offer.price), previous = amount(offer.previousPrice);
    const discount = current > 0 && previous > current ? Math.round((1-current/previous)*100) : 0;
    const savings = previous > current ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(previous-current) : '';
    const caption = '🧪 PRUEBA DE DISEÑO\nDatos guardados; precio y cupón no comprobados de nuevo.\n\n' + formatTelegramDealCard({title:offer.title,store:offer.store,price:offer.price,previousPrice:offer.previousPrice,coupon:offer.coupon,description:offer.description,discount,savings});
    if (caption.length > 1024) throw new Error('La prueba excede el límite de la foto.');
    const imagePath = String(offer.image);
    if (!/^\/tg\/[a-zA-Z0-9._-]+$/.test(imagePath)) throw new Error('Ruta de imagen de prueba no permitida.');
    const form = new FormData();
    form.set('chat_id', channelId);
    form.set('caption', caption);
    form.set('parse_mode', 'HTML');
    form.set('disable_notification', 'true');
    const photo = await createDealImageCard({imageBytes:await readFile(new URL(`../public${imagePath}`,import.meta.url)),store:offer.store,price:offer.price,previousPrice:offer.previousPrice,coupon:offer.coupon,discount});
    form.set('photo',new Blob([photo],{type:'image/jpeg'}),'prueba-diseno.jpg');
    form.set('reply_markup', JSON.stringify(offerReplyMarkup({url:offer.url,store:offer.store})));
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.description || 'No se pudo enviar la foto de prueba.');
    const message = result.result;
    status.sent = true;
    status.messageId = message.message_id;
    status.kind = 'photo-format-preview';
    status.sourceMessageId = offer.message_id;
  } catch (error) {
    status.error = safeError(error);
  }
}

await (await import('node:fs/promises')).writeFile(statusFile, `${JSON.stringify(status, null, 2)}\n`);
console.log(JSON.stringify(status));
import { readFile } from 'node:fs/promises';
import { formatTelegramDealCard, offerReplyMarkup } from './offer-presentation.mjs';
import { createDealImageCard } from './deal-image-card.mjs';

