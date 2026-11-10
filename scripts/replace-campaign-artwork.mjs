import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { caption as switchCaption, ID as switchId } from './publish-switch-11-preview.mjs';
import { caption as mediaCaption, ID as mediaId, affiliateUrl } from './publish-mediamarkt-singles.mjs';

export const replacements = [
  { id: mediaId, messageId: 8071, state: 'data/mediamarkt-singles-publication.json', image: `/images/${mediaId}-v2.png` },
  { id: switchId, messageId: 8072, state: 'data/switch-11-preview-publication.json', image: `/images/${switchId}-v2.png` },
];
export function replacementPayload(item, state, chat) {
  if (state.record?.id !== item.id || state.record?.message_id !== item.messageId) throw new Error('El justificante no coincide con el mensaje autorizado; no se edita.');
  const keyboard = item.id === mediaId
    ? [[{ text: '🛒 ABRIR PROMOCIÓN · MEDIAMARKT', url: affiliateUrl() }]]
    : state.links?.map((link, index) => [{ text: index ? `🎮 SWITCH 2 · ALTERNATIVA ${index}` : '🎮 SWITCH 2 · OPCIÓN PRINCIPAL', url: link.affiliate }]);
  if (!keyboard?.length || keyboard.some(row => !/^https:\/\//u.test(row[0].url || ''))) throw new Error('Faltan enlaces confirmados.');
  return {
    chat_id: chat, message_id: item.messageId,
    media: { type: 'photo', media: 'attach://photo', caption: item.id === mediaId ? mediaCaption() : switchCaption(), parse_mode: 'HTML' },
    reply_markup: { inline_keyboard: keyboard },
  };
}
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) throw new Error('Falta Telegram.');
  const check = await (await fetch(`https://api.telegram.org/bot${token}/getChat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat }) })).json();
  if (!check.ok || check.result?.username?.toLowerCase() !== 'aldiachollos') throw new Error('El canal no coincide con aldiachollos.');
  const posts = JSON.parse(fs.readFileSync('data/posts.json', 'utf8'));
  for (const item of replacements) {
    const state = JSON.parse(fs.readFileSync(item.state, 'utf8'));
    const payload = replacementPayload(item, state, chat);
    const form = new FormData();
    form.set('chat_id', chat); form.set('message_id', String(payload.message_id));
    form.set('media', JSON.stringify(payload.media)); form.set('reply_markup', JSON.stringify(payload.reply_markup));
    form.set('photo', new Blob([fs.readFileSync(`public${item.image}`)], { type: 'image/png' }), path.basename(item.image));
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, { method: 'POST', body: form });
    const result = await response.json();
    if ((!response.ok || !result.ok) && !/message is not modified/iu.test(result.description || '')) throw new Error(`No se pudo sustituir ${item.messageId}: ${result.description || response.status}`);
    state.record.image = item.image; state.artworkUpdatedAt = new Date().toISOString();
    fs.writeFileSync(item.state, `${JSON.stringify(state, null, 2)}\n`);
    const post = posts.find(p => p.id === item.id);
    if (post) { post.image = item.image; post.reviewed = '2026-11-10'; }
    fs.writeFileSync('data/posts.json', `${JSON.stringify(posts, null, 2)}\n`);
    console.log(`Imagen sustituida sin reenviar: ${item.messageId}`);
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
