# VYRO para Samsung Tizen TV 5.0

Aplicación web de pantalla completa para Samsung Smart TV 2019 con Tizen 5.0 y Chromium 69. No requiere un proceso de compilación ni paquetes locales.

## Estructura

- `config.xml`: manifiesto Tizen TV, versión requerida, perfil, privilegio de internet y acceso al backend.
- `index.html`: login, navegación lateral, catálogo, búsqueda y reproductor.
- `style.css`: interfaz de 10 pies con foco visible y diseño para pantalla grande.
- `app.js`: autenticación de demostración, navegación con D-pad, API y reproducción HLS/iframe.
- `assets/`: logotipo VYRO incluido en el proyecto.

## Ejecución

Importa la carpeta como aplicación web en Tizen Studio, asígnale un certificado de Samsung y ejecútala en un televisor o emulador con Tizen 5.0. Antes de ejecutarla, reemplaza `X.X.X.X` en `API_BASE` dentro de `app.js` por la IP LAN del equipo que sirve la API en el puerto 3000. El televisor y el servidor deben poder comunicarse por la red local.

El usuario de demostración es `Randy` y la contraseña es `123`. La validación está en el cliente según el contrato de esta demo; una aplicación de producción debe validar credenciales en el servidor.

## Endpoints

- `GET /api/matches` → `{ success: true, matches: [{ title, time, url }] }`
- `GET /api/movies`, `/api/movies/featured`, `/api/series`, `/api/episodes` → `{ success: true, data: [{ title, poster, url }] }`
- `GET /api/search?q=...` → `{ success: true, data: [{ title, poster, url }] }`
- `GET /api/stream?url=...` → `{ success: true, streamUrl, type: "hls" | "iframe" }`

Para HLS se carga hls.js 0.14.17 desde jsDelivr cuando no hay soporte nativo. En redes sin acceso a internet, sirve la distribución clásica localmente y actualiza `loadHlsLibrary()` en `app.js`.
