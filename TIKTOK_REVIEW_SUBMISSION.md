# Solicitud de revisión de TikTok

Valores preparados para la aplicación `Rocky ChollosAlDia`.

## App details

- App icon: `public/tiktok-app-icon-1024.png` (1024 x 1024 PNG)
- App name: `Rocky ChollosAlDia`
- Category: `Shopping`
- Description (máximo 120 caracteres):

  `Spanish deals website that prepares verified offer photos and descriptions for its authorized TikTok account.`

- Terms of Service URL: `https://chollosaldia.com/terminos/`
- Privacy Policy URL: `https://chollosaldia.com/privacidad/`
- Platform: `Web`
- Website URL: `https://chollosaldia.com/`
- Redirect URI: `https://chollosaldia-telegram.peitolerito.workers.dev/tiktok/oauth/callback`

## Productos y permisos necesarios

- Content Posting API
- Direct Post
- `video.upload`
- `video.publish`

No solicitar productos ni permisos adicionales que no se muestren en el vídeo.

## App review

`ChollosAlDia is a Spanish deals website. The Content Posting API lets the authorized administrator prepare a deal photo post with a product image, title and description for the official ChollosAlDia TikTok account. video.upload sends an administrator-confirmed post to TikTok as a draft for final editing. video.publish is used for Direct Post after the administrator reviews the preview, creator information, privacy setting and commercial-content options and expressly confirms publication. The integration queries creator information before Direct Post, uses only HTTPS images hosted on the verified chollosaldia.com domain, and checks the resulting publication status. TikTok OAuth is handled through the configured callback. Credentials are stored securely and can be revoked by disconnecting TikTok. The app does not publish to accounts that have not completed OAuth authorization.`

## Vídeo requerido

El vídeo debe ser una grabación real del flujo Sandbox, no una animación ni una simulación. Debe mostrar, sin cortes que oculten pasos:

1. `https://chollosaldia.com/` visible en la barra de direcciones.
2. Conexión OAuth de la cuenta Sandbox.
3. Preparación de una oferta con foto, título y descripción.
4. Vista previa y controles de privacidad/contenido comercial.
5. Confirmación explícita del administrador.
6. Recepción del borrador o publicación en TikTok.

Ocultar contraseñas, tokens, claves, códigos de verificación y cualquier dato personal que no sea necesario.
