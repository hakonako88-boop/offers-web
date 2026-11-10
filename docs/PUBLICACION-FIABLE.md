# Publicación fiable: primera fase

## Ejecuciones pendientes

El publicador (incluido el buzón privado), el vigilante y los publicadores que
comparten el grupo de producción usan `queue: max` y `cancel-in-progress: false`.
GitHub permite hasta 100 ejecuciones pendientes por grupo. No es una cola
ilimitada ni elimina errores de red: evita sustituir silenciosamente una
ejecución pendiente por otra nueva dentro de esa capacidad.

La antigua reserva puntual de GTA solo se puede lanzar manualmente; cambiar
su YAML no inicia una publicación ni ocupa por sí solo la cola de producción.
Conserva sus comprobaciones de duplicidad y de fecha del precio comprobado.

No se modifica el Worker de Cloudflare ni se contrata un servicio nuevo.

## Cuotas ordinarias

| Tienda | Máximo diario ordinario |
| --- | ---: |
| Amazon | 10 |
| AliExpress | 16 |
| Miravia | 3 |
| MediaMarkt | 6 |
| PcComponentes | 6 |
| El Corte Inglés | 6 |
| Xiaomi | 3 |

Son máximos, no objetivos obligatorios. Los filtros de calidad, datos, afiliación
y duplicados siguen siendo necesarios. La excepción existente para el periodo
Black Friday/Cyber Monday añade cuatro oportunidades por tienda.

La cuota base de cada franja se conserva. Cuando se llena, una tienda con pocas
publicaciones puede usar una reserva compartida de hasta seis oportunidades
por encima de esa cuota. El acceso está limitado a una publicación por tienda
cuando la cuota base es de 4 a 13 y a dos cuando es de 14 o más. Las publicaciones
que ya tiene la tienda cuentan para ese umbral: no se le regalan dos mensajes
adicionales a una tienda que ya ha publicado mucho. No hay reserva al comenzar
la mañana con una cuota base de 1 o 2.

Se mantienen los ocho minutos entre publicaciones ordinarias y el horario de
descanso, según Europe/Madrid. Las ofertas verificadas de NoLoDejesEscapar
mantienen su excepción sin límite diario y su pausa entre publicaciones.

## Panel privado

Enviar `/estado` a Rocky y abrir **COLA** o **TIENDAS**.

- Con turno para verificar: entradas recientes cuyo reintento ya puede empezar
  y cuya política de publicación deja turno; no significa producto verificado.
- Esperando reintento: todavía no ha llegado la fecha de reintento.
- Frenadas por horario o cuota: desglose de descanso, pausa y límites.
- Fuera del plazo: pendientes que ya no son recientes; no se reactivan a ciegas.
- Necesitan revisión: desglose de precio, foto, producto exacto/ASIN,
  afiliación o filtro de calidad, según el motivo guardado.
- Tiendas: motivo de disponibilidad/bloqueo y contador de cuota ordinaria.

## Comprobación Telegram ↔ web

El botón **TELEGRAM ↔ WEB** del panel privado revisa bajo demanda las cinco
últimas publicaciones con datos suficientes, sin usar credenciales de tiendas.
Solo consulta las fichas públicas de chollosaldia.com, el manifiesto público del
último despliegue y los mensajes públicos de @aldiachollos. Hay un máximo de
cuatro consultas simultáneas y tiempo de espera por petición.

Comprueba el ID y el enlace de compra del mensaje, su precio cuando se puede
leer de forma inequívoca, la URL canónica de la ficha y su precio/enlace frente
al registro guardado. Una respuesta HTTP 200 por sí sola no es una confirmación.
Las páginas nuevas incluyen ID, precio y estado como atributos de diagnóstico;
las antiguas pueden comprobarse por su precio visible y enlace canónico.

Un mensaje no visible en la vista pública se indica como **no confirmado**, no
como perdido. Si el mensaje no incluye un precio reconocible, tampoco se da por
verificado. Las fichas finalizadas se distinguen de las ofertas activas. Si una
URL da 404 y el último despliegue es anterior a la oferta, se muestra ese dato.

Esta comprobación no verifica el precio actual de la tienda, no cambia ofertas,
no publica reintentos, no reenvía mensajes y no migra el estado a Cloudflare Queues.
