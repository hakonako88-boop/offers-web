# Automatización de ChollosAlDía

La web recibe ofertas mediante `POST /api/deals` y puede publicarlas en Telegram. La publicación pública usa GitHub Actions cada 30 minutos.

## Secretos necesarios

Configura estos valores en GitHub Actions Secrets. Nunca los compartas por chat ni los subas al repositorio.

- `AMAZON_CREATOR_CREDENTIAL_ID`, `AMAZON_CREATOR_SECRET` y `AMAZON_CREATOR_VERSION`: credenciales de Amazon Creators API.
- `AMAZON_PARTNER_TAG`: tracking ID de Amazon Afiliados (`chollos00a-21`).
- `TELEGRAM_BOT_TOKEN`: token de BotFather.
- `TELEGRAM_CHANNEL_ID`: ID numérico del canal; el bot debe ser administrador.
- `IMPORT_SECRET`: contraseña aleatoria para autorizar importaciones al endpoint de la web.

## Automatización activa de Amazon

Cada 30 minutos, GitHub consulta dos categorías rotativas con Amazon Creators API. Solo publica un máximo de dos productos nuevos si tienen una oferta de Amazon o un descuento de al menos el 20%, foto, precio, enlace atribuido y disponibilidad. El sistema no repite ASIN publicados durante 120 días.

Cada publicación sale primero por Telegram con foto, precio, ahorro y botón de compra. La siguiente sincronización incorpora la misma oferta a la web y la publicación pública se actualiza.

Amazon puede devolver `AssociateNotEligible` hasta validar la elegibilidad de la cuenta. En ese caso no se envía nada a Telegram y la web sigue disponible.

## AliExpress

AliExpress debe proporcionar el enlace afiliado desde AliExpress Portals/Open Platform. No se inventan parámetros de afiliación ni se extraen precios mediante scraping: evita enlaces sin atribución y precios incorrectos.

## Formato de una oferta manual

```json
{
  "id": "sku-o-asin-estable",
  "title": "Nombre claro del producto",
  "store": "Amazon",
  "category": "Tecnología",
  "price": 29.99,
  "oldPrice": 59.99,
  "coupon": "SONIDO10",
  "imageUrl": "https://.../foto.jpg",
  "url": "https://www.amazon.es/dp/...",
  "badge": "Top del día"
}
```

Envía las importaciones manuales con `Authorization: Bearer TU_IMPORT_SECRET`.
