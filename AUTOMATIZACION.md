# Automatización de ChollosAlDía

Las ofertas automáticas se descubren mediante fuentes públicas permitidas, se comprueban de nuevo en el catálogo oficial de la tienda y se publican mediante GitHub Actions. Cada oferta aceptada llega a Telegram y se guarda en la web.

## Horario Europe/Madrid

Hay cinco tandas diarias. Cada tanda reserva dos posiciones para AliExpress, dos para Miravia y una para Amazon cuando Creators API está disponible:

| Tanda | AliExpress | Miravia | AliExpress | Miravia | Amazon |
| --- | --- | --- | --- | --- | --- |
| 09:00 | 09:00 | 09:04 | 09:08 | 09:12 | 09:16 |
| 11:30 | 11:30 | 11:34 | 11:38 | 11:42 | 11:46 |
| 14:30 | 14:30 | 14:34 | 14:38 | 14:42 | 14:46 |
| 18:30 | 18:30 | 18:34 | 18:38 | 18:42 | 18:46 |
| 21:30 | 21:30 | 21:34 | 21:38 | 21:42 | 21:46 |

El máximo teórico es de veinticinco ofertas al día: diez de AliExpress, diez de Miravia y cinco de Amazon. Cada posición es una ejecución independiente. El fallo de una tienda, una imagen o un producto no cancela las posiciones posteriores.

Cada horario declara directamente `timezone: Europe/Madrid`. GitHub ajusta automáticamente el cambio de verano e invierno, por lo que las horas peninsulares se conservan durante todo el año.

Una posición puede quedar vacía. Nunca se publica un producto inventado o incompleto para alcanzar el máximo.

Amazon se comprueba en sus posiciones programadas, pero solo publica cuando la cuenta tiene acceso aprobado a Creators API y la respuesta oficial incluye ASIN, imagen, precio y disponibilidad. Sin elegibilidad no copia contenido externo ni publica datos incompletos. Continúa disponible para publicaciones manuales creadas con SiteStripe o Mobile GetLink.

## Descubrimiento prioritario

Las señales editoriales se consultan en este orden:

1. MiChollo.
2. NoLoDejesEscapar.com.
3. Fuentes oficiales de AliExpress y el feed privado de Miravia en Awin.

Las páginas de chollos sirven para descubrir productos y tendencias. Sus descripciones, imágenes y enlaces de afiliado no se copian como datos definitivos. Antes de publicar, el producto debe encontrarse otra vez en AliExpress o en el catálogo de Miravia, donde se verifican el precio, la imagen, el descuento y la identidad del producto.

Chollometro puede permanecer como señal secundaria de respaldo para AliExpress, con una prioridad inferior a MiChollo y NoLoDejesEscapar.

### Canales públicos de Telegram

Los canales públicos aprobados por el propietario se declaran en `data/telegram-source-channels.json`. El formato de cada fuente es:

```json
{
  "id": "nombre-interno",
  "url": "https://t.me/nombre_publico",
  "store": "AliExpress",
  "weight": 20
}
```

También se admite `Miravia` en `store`. El lector utiliza exclusivamente la vista pública `t.me/s/...`; no inicia sesión con una cuenta personal, no entra en grupos privados y no descarga las fotografías del canal. Solo conserva el enlace de producto, la hora y términos suficientes para identificar el artículo en la fuente oficial. Los enlaces acortados de AliExpress se resuelven hasta el identificador exacto y se convierten mediante la API de esta cuenta. En Miravia, el producto debe coincidir con el feed Awin de esta cuenta.

## Afiliación

- **AliExpress:** la API oficial genera `promotion_link` usando `ALIEXPRESS_TRACKING_ID`. El enlace debe corresponder al mismo identificador de producto encontrado en la fuente.
- **Miravia:** las ofertas automáticas usan enlaces atribuidos del feed privado de Awin. Las entradas manuales se reconstruyen para el publisher `2023977` y el programa Miravia `37168` cuando se conoce la URL oficial o el identificador Awin del producto.
- **Amazon:** las publicaciones manuales y automáticas usan `AMAZON_PARTNER_TAG`. Las automáticas solo consultan Creators API, verifican el ASIN exacto y conservan la imagen en la URL oficial de Amazon; sin una respuesta autorizada no publican.

Nunca se conserva como destino final el identificador de afiliación de MiChollo, NoLoDejesEscapar u otro canal.

## Imagen de la publicación

Telegram recibe una creatividad cuadrada propia de ChollosAlDía generada a partir de la fotografía limpia del catálogo oficial. La franja inferior muestra tienda, precio actual, precio anterior y descuento únicamente cuando esos datos están verificados. Si no se puede construir la creatividad, el proceso conserva como respaldo la imagen oficial del producto; nunca usa como fotografía automática la tarjeta editada por otro canal.

La web mantiene la fotografía limpia del producto para que las fichas y las tarjetas carguen con mejor calidad y sin texto incrustado.

## Validación editorial

Una oferta se publica solo cuando dispone de:

- Tienda e identidad de producto válidas.
- Título fiable.
- Precio actual verificable.
- Imagen oficial o segura de calidad suficiente.
- Enlace de afiliado propio y válido.
- Descuento real o interés comercial suficiente.
- Producto no publicado recientemente.

Los cupones, valoraciones, ventas, envío gratuito y precios anteriores se muestran únicamente cuando la fuente oficial los proporciona y pueden verificarse. No se afirman mínimos históricos, escasez ni duración limitada sin una prueba fiable.

## Duplicados e historial

La identidad se compara primero por ASIN, product ID, SKU o identificador Awin/AliExpress; después por URL canónica y, solo como respaldo, por similitud de título. El historial almacena tienda, producto, título, precio, afiliado, fuente, fecha y estado. Los productos ya publicados se excluyen de las posiciones posteriores.

## Bot privado

El propietario puede enviar enlaces de AliExpress, Miravia, MiChollo o NoLoDejesEscapar. El bot intenta resolver el botón externo permitido, identifica la tienda, obtiene la ficha oficial, genera el enlace propio, elimina referencias al canal de origen y publica en Telegram y la web.

No se sortean CAPTCHA, autenticaciones ni controles de seguridad. Si una tienda impide verificar un dato obligatorio, el bot solicita solamente lo que falta o descarta la oferta; nunca inventa datos ni sustituye el producto por otro parecido.
