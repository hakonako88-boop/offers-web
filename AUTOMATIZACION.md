# Automatización de ChollosAlDía

Las ofertas automáticas se seleccionan, validan y publican mediante GitHub Actions. Cada oferta aceptada se envía a Telegram y se guarda en `data/offers.json` para aparecer también en la web.

## Horarios activos

Mientras Amazon no tenga acceso aprobado a Creators API, las ejecuciones automáticas se reparten así:

| Hora peninsular de verano | Tienda | Máximo por tanda |
| --- | --- | ---: |
| 09:00 | AliExpress | 3 |
| 11:00 | Miravia | 3 |
| 13:00 | AliExpress | 3 |
| 15:00 | Miravia | 3 |
| 17:00 | AliExpress | 3 |

GitHub programa las tareas en UTC. Los valores actuales corresponden al horario de verano español (UTC+2); al comenzar el horario de invierno deben desplazarse una hora para conservar las horas peninsulares indicadas.

El máximo teórico es de 15 publicaciones diarias. No se completa una tanda con datos inventados: si no hay tres productos nuevos con precio, imagen, descuento y enlace verificables, se publican solo los que superen todos los controles.

Amazon no participa en ninguna ejecución programada. Permanece disponible para publicaciones manuales y para pruebas manuales de la API cuando la cuenta obtenga elegibilidad.

## Enlaces de afiliación

- **AliExpress:** la API oficial consulta el producto y devuelve `promotion_link` usando `ALIEXPRESS_TRACKING_ID`. En el bot privado se vuelve a generar el enlace aunque la URL recibida sea un enlace corto o proceda de otro canal.
- **Miravia:** las ofertas automáticas usan el enlace atribuido del feed privado de Awin. En el bot privado, una URL directa de `miravia.es` se convierte en un enlace Awin asociado al publisher `2023977` y al programa Miravia `37168`. Si se recibe un enlace Awin con un identificador de producto, el bot puede reconstruirlo para esta cuenta.
- **Amazon:** el bot añade y verifica `AMAZON_PARTNER_TAG` en publicaciones manuales. La búsqueda automática seguirá desactivada hasta que Amazon apruebe la API.

El bot nunca debe declarar que un enlace está atribuido si no ha podido crear o verificar una URL válida de la red correspondiente.

## Secretos necesarios

Los valores privados se guardan únicamente en GitHub Actions Secrets y nunca deben compartirse por chat ni incluirse en el repositorio:

- `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` y `ALIEXPRESS_TRACKING_ID`.
- `AWIN_FEED_LIST_URL`.
- `AMAZON_CREATOR_CREDENTIAL_ID`, `AMAZON_CREATOR_SECRET` y `AMAZON_CREATOR_VERSION`, cuando Amazon habilite la cuenta.
- `AMAZON_PARTNER_TAG`.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_WEBHOOK_URL` y `TELEGRAM_WEBHOOK_SECRET`.

## Controles editoriales

Antes de publicar se comprueba que existan título fiable, precio actual, imagen útil y enlace atribuido. También se rechazan productos sin descuento real suficiente, sin interés probado, agotados, con imágenes pequeñas o repetidos recientemente.

Chollometro, No Lo Dejes Escapar y MiChollo se utilizan únicamente como señales para descubrir tendencias. Sus textos, fotografías y enlaces de afiliado no se copian. AliExpress o Awin deben volver a confirmar los datos y generar el enlace propio antes de publicar.

## Publicación desde el bot privado

El propietario puede pegar un enlace de Amazon, AliExpress o Miravia, o reenviar una tarjeta que incluya enlace, título, precio y fotografía. El bot intenta obtener la ficha oficial, genera el enlace propio, elimina referencias al canal original, evita duplicados y publica en Telegram y la web.

Si una tienda bloquea temporalmente la lectura y falta un dato indispensable, el bot conserva los datos seguros del mensaje y solicita únicamente la información que falte; nunca inventa el precio ni sustituye el producto por uno parecido.
