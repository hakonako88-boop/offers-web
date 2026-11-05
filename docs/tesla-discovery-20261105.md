# Descubrimiento continuo de accesorios Tesla

La revisión programada existente se ejecuta cada seis horas (cron UTC `23 */6 * * *`). Se consultan dos temas rotatorios por revisión y se incorporan como máximo dos referencias nuevas por tienda, con un máximo de veinte referencias automáticas por tienda. No es una cuota obligatoria: sin datos válidos no se añade un producto.

AliExpress refresca las fichas exactas y conserva los enlaces originales del propietario. Se exige un precio EUR reciente, imagen HTTPS y enlace del dominio correcto. La admisión automática se limita a accesorios de organización, alfombrillas, protección, parasoles y cuidado; no acredita compatibilidad. Los componentes eléctricos y de seguridad requieren revisión individual.

Amazon utiliza las credenciales de Creators API ya configuradas en GitHub. Los errores de autenticación o consulta se registran sin secretos y no se sustituyen por precios inventados. Solo se persisten ASIN, enlace especial, etiqueta editorial propia y estado de revisión: no se conservan títulos, imágenes, precios ni stock de API en el historial permanente de Git. La interfaz dirige a Amazon para consultar foto y precio vigentes. Mostrar contenido dinámico completo requerirá un backend con caducidad de caché acorde con sus condiciones.

Los dos cargadores seleccionados manualmente son referencias, no certificaciones de compatibilidad ni ofertas verificadas; sus enlaces solo se crean si está configurado el identificador de afiliado. La ausencia de acceso a la API no se presenta como descubrimiento automático satisfactorio.

Pruebas locales: 72 comprobaciones del escaparate, incluidas cinco de admisión, deduplicación, caducidad, rotación y persistencia limitada de Amazon. Este flujo actualiza la sección web Tesla; no crea publicaciones de Telegram.
