# P2P Mate — v0.7.0

Herramienta educativa y local para calcular y organizar escenarios de operaciones P2P. No ejecuta operaciones, no se conecta a cuentas de intercambio y no ofrece asesoramiento financiero.

## Catálogo cerrado de opciones (v0.7.0)
La aplicación solo admite estas ocho opciones en todos los selectores:
- `QUSD`
- `BANK_CUP` (Bank_CUP)
- `BANK_MLC` (Bank_MLC)
- `CLASICA` (Clásica)
- `ETECSA`
- `BANDECPREPAGO` (BandecPrepago)
- `TROPIPAY` (TropiPay)
- `ZELLE` (Zelle)

No se admiten activos cripto adicionales, monedas personalizadas ni texto libre en los campos de opción. La ampliación del catálogo requiere una actualización explícita del proyecto. Las tasas públicas de QvaPay se filtran para mostrar únicamente estos ocho códigos.

## Funciones disponibles
- Calculadora de costes, ingresos, comisiones, beneficio/pérdida, ROI y punto de equilibrio.
- Precio objetivo para un beneficio deseado.
- Comparador de cuatro escenarios.
- Historial con dos categorías: **hipotético** y **real declarado por el usuario**. La aplicación no verifica ni certifica que un registro real haya ocurrido.
- Edición y eliminación de registros.
- Búsqueda por activo, moneda o nota; filtro por tipo.
- Estadísticas agrupadas por moneda y separadas entre registros reales declarados e hipotéticos.
- Exportación CSV y copia/restauración JSON.
- Persistencia principal con IndexedDB y alternativa localStorage cuando IndexedDB no está disponible.
- Tema oscuro/claro y diseño adaptable a móviles.
- Detección de `window.QvaPay`, llamada a `ready()`, sincronización de tema con `getTheme()` y evento `themeChanged`.
- Carga pública de promedios P2P desde `GET https://api.qvapay.com/p2p/averages`, con fecha, ventana estadística y número de muestras cuando están disponibles.
- Modo web independiente cuando no existe el SDK; conversor manual como alternativa si la consulta falla.

## Requisitos
- Node.js 18 o superior para ejecutar las pruebas.
- Navegador moderno para utilizar la aplicación.

## Ejecutar
```bash
npm test
npm run serve
```
Abre `http://localhost:8080`.

## Datos y privacidad
Los registros permanecen en el almacenamiento local del navegador/dispositivo. No se sincronizan entre dispositivos. Borrar los datos del navegador puede eliminarlos; utiliza **Copia JSON** periódicamente y guarda el archivo en un lugar seguro. Restaurar una copia reemplaza el historial actual.

Los registros marcados como **reales declarados** son únicamente declaraciones introducidas por el usuario; P2P Mate no consulta bancos, billeteras ni plataformas para verificarlos.

## Estructura
- `public/index.html`: interfaz.
- `public/styles.css`: estilos responsive.
- `public/app.js`: interacción de la aplicación.
- `public/modules/core.js`: cálculos.
- `public/modules/decimal.js`: aritmética decimal interna.
- `public/modules/storage.js`: IndexedDB, migración, respaldo y alternativa local.
- `public/modules/qvapay.js`: detección del SDK, tema anfitrión y lectura/normalización de tasas públicas.
- `tests/`: pruebas automatizadas.

## Limitaciones de esta versión
- La persistencia es local; todavía no hay sincronización en la nube.
- La edición de registros históricos reabre sus datos de cálculo en la calculadora.
- El almacenamiento local no sustituye una copia de seguridad externa.
- La consulta de tasas requiere conexión y que el navegador permita la petición pública (CORS). Si falla, se muestra el error y el modo manual sigue disponible.
- Los promedios P2P son estadísticas históricas de operaciones completadas, no ofertas ejecutables ni cotizaciones garantizadas. La API puede usar ventanas de 24, 72 o 168 horas según el volumen.
- La integración SDK se debe validar en el simulador oficial y en la vista previa móvil de QvaPay antes de publicar.
- No se solicita login, no se crean ofertas ni se realizan pagos o transferencias.


## FASE 4 — herramientas ampliadas
- Inventario de compras múltiples con coste promedio ponderado.
- Simulación de venta parcial, coste asignado y cantidad/coste restante.
- Calculadora de capital total, comprometido, reserva y disponible.
- Conversor con tasa y comisión introducidas manualmente (sin cotizaciones en vivo).
- Las herramientas no ejecutan operaciones ni consultan saldos de cuentas.

## GitHub + Cloudflare Workers Builds (v0.6.1)

Este repositorio está preparado para conectar el Worker existente cuyo nombre es `p2p`.
El archivo `wrangler.jsonc` configura `public/` como carpeta de archivos estáticos.
El nombre `p2p` debe coincidir con el nombre del Worker de Cloudflare.

### Conectar el repositorio
1. Crea un repositorio GitHub llamado `p2p-mate` (privado es una buena opción mientras desarrollas).
2. Extrae el ZIP del proyecto y sube el contenido de esta carpeta al nivel raíz del repositorio. No subas el ZIP como único archivo.
3. En Cloudflare abre Workers & Pages y selecciona el Worker `p2p`.
4. Ve a Settings > Builds > Connect y autoriza Cloudflare Workers & Pages en GitHub.
5. Selecciona el repositorio `p2p-mate` y la rama `main`.
6. Configura la raíz del proyecto como `/`, deja el comando de compilación vacío y usa `npx wrangler deploy` como comando de despliegue.
7. Guarda la conexión. El siguiente commit en `main` iniciará un despliegue automático.

No agregues claves API, contraseñas, tokens ni archivos `.dev.vars` al repositorio.
Cloudflare puede crear su propio token de despliegue durante la conexión; no es necesario copiar un token manualmente.

### Probar localmente
```bash
npm install
npm test
npm run dev
```

## FASE 6 — despliegue de prueba

La carpeta `public/` es el directorio estático listo para desplegar. No hay proceso de compilación ni dependencias de producción.

### Opción A: carga directa (ZIP)
1. En Cloudflare abre **Workers & Pages** y crea una aplicación **Pages** mediante **Direct Upload / Drag and drop**.
2. Sube el archivo `P2P-Mate-Pages-upload-v0.6.0.zip` generado junto a este proyecto.
3. Cuando termine, Cloudflare mostrará una dirección HTTPS `*.pages.dev`.
4. En la configuración de la Mini-app de QvaPay añade exactamente el origen HTTPS asignado en **Orígenes permitidos** (sin ruta ni barra final).
5. Abre la pestaña **Simulador** del panel de QvaPay y usa esa URL como URL de prueba.

**Importante:** Cloudflare no permite convertir después un proyecto creado con Direct Upload en uno conectado a Git. Si prefieres despliegues automáticos, crea desde el principio un proyecto Pages conectado a GitHub/GitLab y configura `public` como directorio de salida; no se necesita framework ni comando de build.

### Cabeceras para el simulador
`public/_headers` permite que `https://www.qvapay.com` incruste la app mediante `frame-ancestors`. No se configura `X-Frame-Options: DENY` ni `SAMEORIGIN`, porque bloquearían el simulador. También se añaden cabeceras básicas de seguridad y se desactivan cámara, micrófono y geolocalización.

### Lista de comprobación de publicación de prueba
- [ ] La URL HTTPS abre `index.html` sin errores.
- [ ] Los módulos `app.js` y `modules/*.js` se cargan correctamente.
- [ ] El panel de QvaPay detecta el puente `window.QvaPay`.
- [ ] `ready()` oculta el loader del anfitrión.
- [ ] `getTheme()` y `themeChanged` sincronizan el tema claro/oscuro.
- [ ] La sección de tasas muestra datos o un mensaje de error recuperable.
- [ ] El almacenamiento local conserva registros después de recargar.
- [ ] La consola del navegador no muestra errores bloqueantes.

Esta versión no solicita identidad, no usa pagos y no ejecuta operaciones. La vista previa móvil de QvaPay debe tratarse como prueba de interfaz; no habilitar cobros ni permisos de cuenta.


## Migración al catálogo cerrado v0.7.0
Los nuevos registros y las copias restauradas se validan contra el catálogo de ocho opciones. Durante la migración del almacenamiento antiguo, solo se copian registros cuyos dos códigos ya pertenecen al catálogo. Los registros heredados con símbolos ajenos al catálogo permanecen en la clave local antigua `p2pmate.history.v1` y no se incorporan al historial nuevo; conserva una copia de seguridad antes de actualizar si necesitas consultarlos.
