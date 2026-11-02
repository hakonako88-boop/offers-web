# Chollos al Día · sistema visual

Hallmark v2, tema Loom adaptado a la marca existente. La web funciona como un mercado editorial: el producto real, el precio publicado y las condiciones de compra llevan la composición.

- **Papel:** fondo ecru (`--hl-paper`), un segundo tono de papel (`--hl-paper-2`) y superficies claras (`--hl-surface`).
- **Tinta y acento:** texto casi negro (`--hl-ink`), líneas finas (`--hl-rule`) y el coral de Chollos al Día (`--hl-accent`) solo para acciones importantes.
- **Tipografía:** Libre Caslon Display en titulares y precios grandes; Hanken Grotesk en texto, navegación, controles y datos.
- **Forma:** esquinas cuadradas, filas separadas por reglas, sin sombras decorativas ni degradados.
- **Imagen:** fotografías y creatividades reales de las ofertas. Conservar el logotipo oficial de `public/favicon.svg`.
- **Acceso:** foco visible, controles legibles y diseños adaptados a móvil. El precio y la acción principal deben aparecer juntos.

Los tokens están en `app/tokens.css` y `app/hallmark-system.css`. La portada está en `app/hallmark-home.css`; blog, búsqueda, tiendas y fichas de oferta comparten `app/hallmark-pages.css`. Mantener contenido, rutas, filtros, enlaces de afiliación y datos de ofertas al extender el diseño.
