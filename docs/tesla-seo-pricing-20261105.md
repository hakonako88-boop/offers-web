# Tesla: catálogo API, diseño y SEO

## Autorización

El propietario confirmó explícitamente «Publicar tras las pruebas» el 5/11/2026, después de leer el documento que exigía revisión previa. No se cambian los procesos de publicación Telegram ni otras categorías.

## Consulta real de precios

Auditoría aislada: https://github.com/hakonako88-boop/offers-web/actions/runs/42045603456

La API afiliada configurada en GitHub devolvió los diez IDs originales, un cupón y dos candidatos nuevos. Se consultó EUR/España. No se leyeron ni mostraron secretos. Los originales permanecen intactos. Los dos enlaces nuevos proceden del campo `promotion_link` de la respuesta autorizada, no se construyen a mano.

Respuesta guardada en `data/tesla-price-observations.json`. La API aporta precio a nivel de producto, no SKU elegido, envío ni impuestos confirmados. La UI usa **Desde**, fecha/hora Madrid y condiciones. No se certifica compatibilidad de una variante, stock ni total de compra a partir de esos datos.

El cupón se muestra solo para su producto y con mínimo, fechas comunicadas y sujeción a la cesta. Su huso horario no viene en la API: el parser aplica un margen conservador de 14 horas en ambos extremos y no hace descuentos automáticos sobre el precio base.

## Mantenimiento

`Actualizar precios Tesla con API autorizada`: cada seis horas y ejecución manual. Consulta IDs exactos de los diez originales y los dos candidatos revisados; búsqueda de posibles candidatos adicional. Solo IDs revisados se muestran en la web. Un candidato nuevo no entra automáticamente por parecer un Tesla.

En main, actualiza únicamente `data/tesla-price-observations.json`. En una rama de prueba solo genera artefacto. Los resultados ausentes conservan fecha anterior; no hay falsos refrescos. Tras 24 horas, la UI deja de presentar una cifra como reciente. Schedule de GitHub puede retrasarse o fallar: no se promete frescura perpetua. El workflow de web comprueba sus entradas y exporta los cambios tras la finalización del proceso API.

Esto usa cuotas del programa API y minutos de GitHub Actions; no se garantiza coste cero si se superan los límites de la cuenta. No ejecuta un proceso permanente en el PC ni requiere ChatGPT para cada actualización.

## Diseño e integración

- Identidad propia: verde de marca, superficies claras, tipografía sans y naranja para precios/acciones. No se utiliza un logotipo Tesla para fingir vinculación oficial.
- Hero con fotografía real, selector fotográfico, controles avanzados desplegables y tarjetas con precio/cupón destacados.
- Eliminadas las frases «Los accesorios que nos has enviado» y «Precio pendiente de comprobar» de las tarjetas generales. Las limitaciones reales de variante se mantienen de forma legible.
- Sección visual Tesla en la portada, además de los enlaces de navegación existentes.
- Fotos de coches mantienen créditos CC BY-SA al pie. Fotos de accesorios proceden de sus fichas/API; no se sustituyen por imágenes de otros productos.

## Arquitectura SEO

- `/tesla/`: CollectionPage; centro comercial y de contenidos.
- `/tesla/guias/model-y/`: guía por modelo con secciones Juniper, Standard y original.
- `/tesla/guias/model-3/`: guía por modelo con secciones Highland y original.
- `/tesla/guias/alfombrillas/`: criterios de ajuste, contenido de paquetes y coste comparable.
- `/tesla/guias/organizadores/`: consolas, diferencias de acabado y almacenamiento.

Canonical, títulos y descripciones propios, breadcrumbs visibles, BreadcrumbList y Article en guías, sitemap y enlaces internos. No se usa Product en una página con doce artículos diferentes, no se inventan Review/aggregateRating ni InStock. Los precios de lista no se convierten en «el más barato de Internet».

La investigación detallada y las métricas privadas de Search Console se entregan al propietario fuera del repositorio público. Se examinaron ChuchesTesla, Tesla Comunitat Valenciana y Tesla oficial. No se copiaran textos, reseñas ni pruebas. El mapa agrupa keywords por intención y evita páginas automáticas año/acabado. No hay herramienta de volumen/KD conectada: prioridad y dificultad son juicios cualitativos, no cifras inventadas.

Fuentes públicas principales:

- https://chuchestesla.com/tesla-model-y-juniper
- https://www.teslacvalenciana.es/index.php/accesorios-para-tesla-model-3/
- https://shop.tesla.com/es_es/product/bandeja-para-la-consola-central-del-model_y
- https://shop.tesla.com/es_es/product/model-y-premium-and-performance-center-console-trays
- https://shop.tesla.com/es_es/product/model-3-center-console-trays
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet

## Medición

GA4 se mantiene condicionado al consentimiento. Eventos `tesla_hub_view`, `tesla_guide_view` y `affiliate_click` con ID de producto y ruta. No se ha confirmado recepción extremo a extremo en GA4 ni conectado un nuevo informe de comisiones. Un clic no se declara venta. Las conversiones e ingresos requieren datos verificables de la red.

## Pruebas y límites

67 pruebas de storefront: compatibilidad, precios futuros/caducados, cupón por producto, datos estructurados, enlaces originales y aislamiento de Telegram. Los tests usan fechas de fixture, no una expectativa de que la API mantenga mañana el mismo cupón. TypeScript global sigue señalando cinco errores preexistentes de Cloudflare/productos, sin nuevos errores Tesla.

Build/export local completado antes de revisión y repetido tras el ajuste final de filtros. Comprobación Chrome escritorio y emulación móvil 390 px; precio 35 px, sin desbordamiento. No son ensayos en móvil físico, pruebas de rendimiento de campo ni validación de todos los SKUs en cesta. El comparador de artículos idénticos sigue sin inventar un total cuando faltan datos de variante/envío/impuestos.
