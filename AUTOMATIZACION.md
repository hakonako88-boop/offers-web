# Automatización de ChollosAlDía

Las ofertas automáticas se descubren mediante fuentes públicas permitidas, se comprueban de nuevo en el catálogo oficial de la tienda y se publican mediante GitHub Actions. Cada oferta aceptada llega a Telegram y se guarda en la web.

## Publicación por novedades, sin horarios fijos

No existen tandas ni horas de publicación. Un flujo ligero consulta cada cinco minutos la vista pública de los canales aprobados y guarda el último identificador visto de cada canal. Cuando alguno avanza, se lanza una revisión de Amazon, AliExpress y Miravia. Si no hay mensajes nuevos, no se reconstruye la web ni se intenta publicar.

La reacción habitual es de hasta cinco minutos, más el tiempo de cola de GitHub Actions y la consulta a la tienda. GitHub no garantiza ejecución al segundo, por lo que puede existir un pequeño retraso. Una novedad no obliga a publicar: los filtros de tienda, calidad, duplicados, imagen, precio y afiliación siguen siendo obligatorios.

En cada revisión se publica como máximo una oferta validada por tienda. Si llegan varias novedades juntas, quedan disponibles para las revisiones siguientes y nunca se inventan productos para alcanzar una cantidad.

Amazon solo publica cuando la cuenta tiene acceso aprobado a Creators API y la respuesta oficial incluye ASIN, imagen, precio y disponibilidad. Sin elegibilidad no copia contenido externo ni publica datos incompletos. Continúa disponible para publicaciones manuales creadas con SiteStripe o Mobile GetLink.

## Descubrimiento prioritario

Las señales editoriales se consultan en este orden:

1. MiChollo.
2. NoLoDejesEscapar.com.
3. Fuentes oficiales de AliExpress y el feed privado de Miravia en Awin.

Las páginas de chollos sirven para descubrir productos y tendencias. Sus descripciones, imágenes y enlaces de afiliado no se copian como datos definitivos. Antes de publicar, el producto debe encontrarse otra vez en AliExpress o en el catálogo de Miravia, donde se verifican el precio, la imagen, el descuento y la identidad del producto.

Chollometro puede permanecer como señal secundaria de respaldo para AliExpress, con una prioridad inferior a MiChollo y NoLoDejesEscapar.

### Canales públicos de Telegram

Los canales públicos aprobados por el propietario se declaran en `data/telegram-source-channels.json`. El vigilante guarda su posición en `data/telegram-channel-checkpoints.json`. El formato de cada fuente es:

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
