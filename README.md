# Cocos Challenge

Aplicación React Native con TypeScript para el [desafío de Cocos](https://github.com/cocoscap/cocos-challenge/blob/main/react-native-challenge.md).

Estado actual: base del proyecto (Spec 1). Inicia con una pantalla de bienvenida; las funciones de mercado, búsqueda, portfolio y órdenes se implementan en las siguientes etapas.

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

El cliente HTTP está en `src/api/client.ts`, con headers comunes y un timeout de 10 segundos. El valor da margen a las demoras relatadas durante la exploración; no representa un SLA del servidor. No se agregaron interceptores ni reintentos automáticos.

## Verificación

```sh
npm run typecheck
npm run lint
npx expo install --check
npx expo-doctor
```

La evidencia de ejecución y sus límites se registran en [Spec 1](docs/plans/2026-11-07-spec-1-base.md). Todavía no hay lógica financiera ni tests de operaciones.

Aviso conocido del tooling: `npm audit` reporta 12 avisos moderados por `glob`/`minimatch` en dependencias de Expo y ESLint, sin avisos altos ni críticos. Las actualizaciones compatibles ya se aplicaron; la corrección forzada propone versiones incompatibles de Expo. Ver el detalle y los límites en el Spec 1.

## Decisiones técnicas

- **Expo y expo-router:** simplifican la preparación y ejecución local. Se parte de la plantilla oficial y se retiran sus demos.
- **Carpetas por tipo:** `src/app` contiene rutas, `src/api` el acceso HTTP y `src/config` la configuración. Se crean otras carpetas cuando tienen código que alojar.
- **axios:** reutiliza transporte, timeout y cancelación. Los headers fijos se configuran en una instancia compartida.
- **TanStack Query:** gestiona los datos del servidor y se conecta en la raíz con un cliente estable. Las claves, invalidación y políticas se definen junto con cada función.
- **Zod:** valida la configuración externa y luego permitirá validar las respuestas según el contrato de cada endpoint.
- **Alcance por etapas:** precisión monetaria, errores normalizados, búsqueda concurrente y envío de órdenes se diseñan en sus propios specs. No hay mecanismos anticipados para funciones todavía inexistentes.

El proyecto conserva la licencia MIT de la plantilla Expo en `LICENSE`.
