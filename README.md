# Cocos Challenge

Aplicación React Native con TypeScript para el [desafío de Cocos](https://github.com/cocoscap/cocos-challenge/blob/main/react-native-challenge.md).

Estado actual: Mercado muestra acciones, precios en pesos y retorno respecto del cierre. Incluye actualización manual/al regresar a la app, datos parciales y errores recuperables. Búsqueda, portfolio y órdenes corresponden a las siguientes etapas.

## Requisitos

- Node.js 24 (versión usada: `24.7.0`, también indicada en `.node-version`) y npm.
- Para iOS local: macOS con Xcode, sus herramientas de línea de comandos y un simulador de iOS instalado. Seleccionar Xcode en Settings → Locations → Command Line Tools; los simuladores se instalan en Settings → Components.
- Para Android local: Android Studio con SDK y emulador configurados. Esta plataforma todavía no fue verificada.

No hace falta instalar Expo CLI globalmente ni crear una cuenta de Expo. Los comandos usan la versión del proyecto. Expo Go para el simulador se descarga al abrir iOS por primera vez.

## Instalación y ejecución

```sh
git clone https://github.com/mbelenmontoya/cocos-challenge.git
cd cocos-challenge
npm ci
cp .env.example .env
```

Editar `EXPO_PUBLIC_CANDIDATE_ID` en `.env` y usar un identificador propio y estable para los datos de prueba. El backend separa los datos usando este header. No es autenticación; el identificador y todas las variables `EXPO_PUBLIC_*` son visibles en la app. No colocar secretos en ellas.

```sh
npm run ios
```

Este comando inicia Metro y abre la app en el simulador. Para iniciar únicamente Metro y elegir plataforma desde su terminal:

```sh
npm start
```

También están disponibles `npm run android` y `npm run web`. Su presencia no implica que se hayan verificado esas plataformas. Para un teléfono físico, comprobar que su versión de Expo Go admite el SDK 58 del proyecto; el simulador permite descargar la versión compatible automáticamente.

## Configuración

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base de la API de prueba. |
| `EXPO_PUBLIC_CANDIDATE_ID` | Identifica los datos de prueba del candidato. |
| `EXPO_PUBLIC_ENABLE_BUGS` | Modo del backend: `off`, `easy`, `medium` o `hard`. Empezar con `off`. |

La configuración se valida con Zod al iniciar. Si falta un valor o es inválido, el error indica el campo afectado. Después de cambiar `.env`, recargar completamente la app. `.env` queda fuera de Git; `.env.example` es la referencia compartida.

El cliente HTTP está en `src/api/client.ts`, con headers comunes y un timeout de 10 segundos por intento; no representa un SLA del servidor. Su interceptor normaliza errores sin reintentarlos. Mercado configura sus propios reintentos de lectura; esta política no se aplica automáticamente a futuras órdenes.

## Verificación

```sh
npm test -- --runInBand
npm run test:api
npm run typecheck
npm run lint
npx expo install --check
npx expo-doctor
```

`npm test` ejecuta las pruebas locales sin depender de Cocos:

- **Dominio:** retorno con distintos signos y precisión; una respuesta mixta con precios inválidos, identidad inválida y MONEDA; y la diferencia entre catálogo vacío y corrupción total.
- **Transporte y consultas:** HTTP real en loopback para petición correcta, HTML con status de error vs HTML inesperado, timeout de producción y reintentos acotados ante una conexión interrumpida seguida de errores 503. El cliente, interceptor, parser y política de TanStack son los de producción.

`npm run test:api` ejecuta por separado una lectura de `/instruments` contra Cocos con bugs off. No fija precios ni cantidad de instrumentos, no envía órdenes ni reinicia cuentas. Una caída o cambio incompatible del servidor hace fallar esa comprobación; no se transforma en éxito. El contrato externo está excluido de `npm test`.

Las pruebas locales cubren cálculos/interpretación y solicitudes HTTP reales contra un servidor local. No prueban el adaptador nativo de iOS. Las expectativas correctas se conservan cuando descubren un error; se corrige producción. Se comprobó que un divisor incorrecto y un timeout desactivado hacen fallar las pruebas correspondientes sin cambiar sus expectativas.

La evidencia y los límites están en [Spec 2](docs/plans/2026-11-08-spec-2-mercado-errores.md); la preparación inicial se registra en [Spec 1](docs/plans/2026-11-07-spec-1-base.md). Todavía no hay operaciones de compra/venta.

Aviso conocido del tooling (2026-11-08): tras incorporar Jest, `npm audit` reporta 31 avisos (1 bajo y 30 moderados), sin altos ni críticos, en el árbol de herramientas de Expo, ESLint y Jest. Las correcciones propuestas incluyen versiones incompatibles/downgrades; no se aplica `--force`. Ver evidencia en el Spec 2.

## Decisiones técnicas

- **Expo y expo-router:** simplifican la preparación y ejecución local. Se parte de la plantilla oficial y se retiran sus demos.
- **Organización por feature:** el código específico de Mercado, búsqueda, portfolio y órdenes se agrupa en `src/features/markets`, `search`, `portfolio` y `orders`. Cada feature reúne sus llamadas al endpoint, validación, consultas, cálculos, UI y pruebas para corregir una funcionalidad principalmente en un mismo lugar. Se empieza con archivos directos y se crean carpetas cuando tienen código que alojar.
- **Código compartido:** `src/app` contiene rutas y provider; `src/api` conserva una única instancia HTTP y normalización común de errores; `src/config` contiene la configuración. Las features usan este código compartido y no importan detalles internos de otras features. Los componentes se comparten cuando una segunda feature los necesita. Ver [Spec 1a](docs/plans/2026-11-08-spec-1a-estructura-features.md).
- **axios:** reutiliza transporte, timeout y cancelación. Los headers fijos se configuran en una instancia compartida.
- **TanStack Query:** gestiona los datos del servidor y se conecta en la raíz con un cliente estable. Las claves, invalidación y políticas se definen junto con cada función.
- **Zod y fallos parciales:** validar el contenedor y cada instrumento. Una acción identificable con precio inválido conserva su fila y muestra el dato como no disponible; no se inventan ceros ni retornos. Un registro sin identidad se omite con aviso. La corrupción total es error, no lista vacía.
- **Actualización por eventos:** al entrar/volver a Mercado, reactivar la app y deslizar para actualizar. Sin polling ni calendario de mercado para esta app de prueba. Se conserva una captura en memoria mientras se consulta, señalando fallos de actualización. La hora mostrada es la última consulta exitosa, no la hora de la cotización. No se promete un feed en tiempo real.
- **Reintentos acotados:** solo Mercado reintenta red, timeout y HTTP 500/502/503/504 hasta dos veces, con exponential backoff y full jitter. Errores 4xx o datos inválidos requieren intervención. Desuscribir la consulta fuera de foco detiene reintentos pendientes y permite cancelar respuestas obsoletas. Actualizaciones simultáneas comparten la solicitud.
- **Instrumentos y cálculos:** Mercado muestra `ACCIONES`; `MONEDA` se reconoce y separa deliberadamente. ARS no representa el efectivo del usuario: ese dato provendrá de `cash` en Portfolio. Retorno = `(last_price - close_price) / close_price * 100`, con entradas positivas/finitas y resultado finito. Number se utiliza para este porcentaje informativo; la representación del dinero para operar se definirá en su etapa. Redondear solo al presentar.
- **UI y alcance:** lista inspirada en Binance Lite, adaptada a español/ARS, con signo además de color. Se usan FlatList y componentes nativos. Búsqueda concurrente y envío de órdenes se diseñan en sus propios specs.

El proyecto conserva la licencia MIT de la plantilla Expo en `LICENSE`.
