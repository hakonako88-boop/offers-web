# Web y ofertas: dos procesos independientes

## Diseño y contenido público

El workflow **Desplegar web sin rastrear ofertas** (`web-deploy.yml`) construye
`main` y publica `out-github` en `gh-pages`. No ejecuta rastreadores, no envía
mensajes a redes sociales y no recibe credenciales de Telegram o afiliación.

Arranca con cambios de código/contenido público, manualmente desde Actions y
cuando terminan los workflows que guardan ofertas o artículos. Este último
evento permite publicar contenido escrito con `GITHUB_TOKEN`, cuyos commits
no disparan otro workflow de tipo `push`.

Su cola `chollosaldia-web-only` deja terminar la compilación en curso y conserva
una comprobación pendiente con la revisión más reciente. Antes de
publicar compara los archivos públicos de la compilación con `main`. Si ya
existe contenido distinto, no publica esa copia antigua. Cada publicación
incluye `web-build.json` con su revisión y huella de contenido.

La concurrencia se aplica al trabajo de publicación, no al workflow completo:
un evento de origen cancelado u omitido no cancela una compilación válida.
También se comprueban estos eventos: sus pasos `always()` pueden haber guardado
precios o histórico antes de la cancelación. Si cambian datos públicos durante
una compilación, la ejecución pendiente relee `main` y construye la versión nueva;
si nada cambió, termina sin volver a instalar ni compilar.
**Comprobar enlace de despliegue web** es una prueba manual de solo lectura que
permite verificar el encadenamiento sin publicar ofertas ni modificar datos.

Los cursores y contadores privados del bot no forman parte de esa huella.
Si la web ya contiene los mismos archivos, se omiten instalación y compilación.
Una ejecución manual fuerza la compilación, por ejemplo al cambiar configuración
pública del sitio en Secrets.

## Ofertas y bot

**Publicar ChollosAlDía** (`deploy.yml`) sigue procesando y guardando las ofertas,
el inbox y las publicaciones sociales con sus límites, deduplicación y horarios
existentes. Conserva su cola de escritura, pero ya no compila ni publica Pages.
Un push normal de diseño no activa sus tareas de tiendas o administración.
Las comprobaciones manuales y las etiquetas explícitas de reparación siguen
disponibles.

Durante la migración puede existir una ejecución antigua que conserve los pasos
anteriores. Al terminar, el workflow web vuelve a leer `main` y publica la
revisión actual si es necesario. No es necesario cancelar un rastreo que está
guardando publicaciones.
