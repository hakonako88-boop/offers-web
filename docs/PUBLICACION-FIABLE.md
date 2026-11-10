# Publicación fiable: primera fase

## Ejecuciones pendientes

El publicador (incluido el buzón privado), el vigilante y los publicadores que
comparten el grupo de producción usan `queue: max` y `cancel-in-progress: false`.
GitHub permite hasta 100 ejecuciones pendientes por grupo. No es una cola
ilimitada ni elimina errores de red: evita sustituir silenciosamente una
ejecución pendiente por otra nueva dentro de esa capacidad.

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

No se afirma que una oferta aparezca en la web solamente porque exista su
mensaje en Telegram. Esta fase no incorpora confirmación remota por URL ni
migra el estado a Cloudflare Queues; esas son mejoras separadas.
