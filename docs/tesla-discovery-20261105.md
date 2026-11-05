# Descubrimiento continuo de accesorios Tesla

La revisión programada existente se ejecuta cada seis horas (cron UTC `23 */6 * * *`). Se consultan dos temas rotatorios por revisión y se incorporan como máximo dos referencias nuevas por tienda, con un máximo de veinte referencias automáticas por tienda. No es una cuota obligatoria: sin datos válidos no se añade un producto.

AliExpress refresca las fichas exactas y conserva los enlaces originales del propietario. Se exige un precio EUR reciente, imagen HTTPS y enlace del dominio correcto. La admisión automática se limita a accesorios de organización, alfombrillas, protección, parasoles y cuidado; no acredita compatibilidad. Los componentes eléctricos y de seguridad requieren revisión individual.

Amazon utiliza las credenciales de Creators API ya configuradas en GitHub. Los errores de autenticación o consulta se registran sin secretos y no se sustituyen por precios inventados. Solo se persisten ASIN, enlace especial, etiqueta editorial propia y estado de revisión: no se conservan títulos, imágenes, precios ni stock de API en el historial permanente de Git. La interfaz dirige a Amazon para consultar foto y precio vigentes. Mostrar contenido dinámico completo requerirá un backend con caducidad de caché acorde con sus condiciones.

Los dos cargadores seleccionados manualmente son referencias, no certificaciones de compatibilidad ni ofertas verificadas; sus enlaces solo se crean si está configurado el identificador de afiliado. La ausencia de acceso a la API no se presenta como descubrimiento automático satisfactorio.

## Selección diaria

El bloque «Ofertas Tesla de hoy» precede al selector y al catálogo. Selecciona hasta cuatro referencias recientes de AliExpress, con diversidad de categorías, priorizando cambios a la baja del precio anunciado y cupones válidos comunicados por la tienda. No ordena por un supuesto porcentaje de rebaja ni considera que el producto más barato sea necesariamente el mejor. El cliente vuelve a evaluar la caducidad cada minuto.

Cada actualización guarda hasta 120 consultas por identificador en `priceHistory`, dentro del archivo de observaciones existente. No se fabrican fechas anteriores: el histórico empieza con consultas reales guardadas. Se compara la misma base de precio y se excluyen puntos futuros, antiguos o en otra moneda. Al ser precios de ficha sin SKU confirmado, una bajada solo se etiqueta como precio anunciado inferior a la consulta anterior; no como ahorro garantizado, mínimo del mercado o descuento calculado. Amazon no se incorpora a ese histórico.

Prueba real del 5 de noviembre: AliExpress incorporó dos referencias y Amazon devolvió HTTP 403 en las consultas de productos y búsqueda. Las referencias manuales de Amazon conservan su tag; no se presenta el descubrimiento de esa tienda como operativo.

Pruebas locales: 76 comprobaciones del escaparate, incluidas admisión, deduplicación, caducidad, rotación, selección diaria, aislamiento del histórico Amazon y persistencia limitada de Amazon. Este flujo actualiza la sección web Tesla; no crea publicaciones de Telegram.
