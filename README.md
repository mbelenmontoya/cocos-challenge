# Cocos Challenge

Aplicación React Native con TypeScript para el [desafío de Cocos](https://github.com/cocoscap/cocos-challenge/blob/main/react-native-challenge.md).

Estado actual: Mercado muestra todos los instrumentos que devuelve `/instruments`, precios en pesos y retorno respecto del cierre. Incluye búsqueda por ticker, actualización manual/al regresar a la app, datos parciales y errores recuperables. Portfolio muestra los activos con cantidad, valor de mercado, ganancia y rendimiento. Tocar un instrumento de Mercado (menos la fila de pesos) abre un modal para enviar una orden de compra o venta, `MARKET` o `LIMIT`, por cantidad de acciones o por monto en pesos, y muestra el `id` y el `status` que devuelve la API. Antes de enviar, avisa si una compra supera el efectivo disponible o una venta supera las acciones de la tenencia.

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

El cliente HTTP está en `src/lib/client.ts`, con headers comunes y un timeout de 10 segundos por intento; no representa un SLA del servidor. Su interceptor normaliza errores sin reintentarlos. Mercado configura sus propios reintentos de lectura; el envío de órdenes nunca se reintenta.

## Verificación

```sh
npm test -- --runInBand
npm run test:api
npm run typecheck
npm run lint
npm run test:coverage
npm run test:mutation
npm run test:e2e
```

`npm test` ejecuta las pruebas locales sin depender de Cocos:

- **Dominio:** retorno con distintos signos y precisión; una respuesta mixta con precios inválidos, identidad inválida y una fila `MONEDA` que se conserva; y la diferencia entre catálogo vacío y corrupción total.
- **Transporte y consultas:** HTTP real en loopback para petición correcta, HTML con status de error vs HTML inesperado, timeout de producción y reintentos acotados ante una conexión interrumpida seguida de errores 503. En la búsqueda, texto normalizado y codificado, y corte del pedido anterior al cambiar el texto. El cliente, interceptor, parser y política de TanStack son los de producción.
- **Debounce:** una sola ejecución con el último valor y cancelación del disparo pendiente, con reloj falso.
- **Cantidad por monto:** la cuenta de acciones se compara con una regla que define el resultado correcto (`cantidad * precio` no supera el monto y una acción más sí lo supera) en todos los precios de 0,01 a 97,56, más montos y precios inválidos de todo tipo.
- **Saldo y acciones disponibles:** compra MARKET contra el último precio y LIMIT contra el precio límite, venta contra la tenencia, el límite exacto de un centavo, y los casos en que falta un dato y decide el servidor.
- **Envío de órdenes:** HTTP real en loopback para el cuerpo exacto, el rechazo 400 con su mensaje, y el resultado incierto ante 503, 408, timeout, conexión cortada o respuesta ilegible, siempre con un solo POST. También cubre dos envíos en el mismo instante, la intención guardada antes del POST, la reconciliación con el historial (orden encontrada, no creada, órdenes previas iguales y órdenes ajenas) y la reapertura con una intención pendiente.
- **Pantalla:** con React Native Testing Library, el modal de órdenes y la fila de Mercado se prueban por rol y etiqueta accesible, como los usa una persona: cálculo por monto, campo vacío al cambiar de modo, precio solo en `LIMIT`, avisos de saldo y acciones, botón desactivado durante el envío y el mensaje de cada resultado. Solo se reemplaza la red.

`npm run test:api` ejecuta por separado los contratos contra Cocos con bugs off: la lectura de `/instruments`, y una compra real con una cuenta descartable que se reinicia al terminar, comprobando el historial, la tenencia, el efectivo descontado y el rechazo por saldo. No fija precios. Una caída o cambio incompatible del servidor hace fallar esa comprobación; no se transforma en éxito. Los contratos están excluidos de `npm test`.

`npm run test:coverage` muestra la cobertura de la suite local como diagnóstico, sin umbral. La lógica de dinero y de envío está cubierta casi por completo; las pantallas de Mercado y Portfolio quedan para los flujos de punta a punta.

`npm run test:mutation` corre [Stryker](https://stryker-mutator.io) sobre los módulos de dinero y envío: modifica el código a propósito y verifica que algún test falle. Resultado medido el 2026-11-11: 94,95 % (282 de 297 mutantes detectados). Los 15 restantes no cambian el comportamiento observable, por ejemplo un chequeo de `null` que la conversión a centavos ya cubre. El reporte queda en `reports/mutation/index.html`.

`npm run test:e2e` corre los flujos de [Maestro](https://docs.maestro.dev) en el simulador iOS con la API real a través de un proxy local que fuerza timeouts, errores y respuestas ilegibles: doble toque, timeout, resultado incierto, cierre de la app con una orden en camino, validaciones y la fila de pesos. Requisitos y detalle en [`e2e/README.md`](e2e/README.md).

Las pruebas locales cubren cálculos/interpretación, solicitudes HTTP reales contra un servidor local y la pantalla de órdenes. No prueban el adaptador nativo de iOS; eso lo cubren los flujos de punta a punta. Las expectativas correctas se conservan cuando descubren un error; se corrige producción. Se comprobó que un divisor incorrecto y un timeout desactivado hacen fallar las pruebas correspondientes sin cambiar sus expectativas.

Aviso conocido del tooling (2026-11-11): `npm audit` reporta 33 avisos (1 bajo y 32 moderados), sin altos ni críticos, en el árbol de herramientas de Expo, ESLint, Jest y Stryker. Las correcciones propuestas incluyen versiones incompatibles/downgrades; no se aplica `--force`.

## Modos de fallas de la API

`EXPO_PUBLIC_ENABLE_BUGS` elige cómo se comporta el backend. Lo siguiente se observó el 2026-11-11 con dos recorridos completos de la app por modo en el simulador iOS (Mercado, buscador, Portfolio y cuatro órdenes), diez lecturas directas de cada endpoint por modo y órdenes enviadas con cuentas descartables. Las fallas son del servidor y pueden variar entre corridas.

| Pantalla | Qué hace la API | Qué muestra la app |
|---|---|---|
| Mercado | `off`: 26 instrumentos correctos. `easy`, `medium` y `hard`: MIRG llega con `last_price` 0. | La fila de MIRG se conserva con precio y retorno «No disponible», y aparece el aviso «Información incompleta». No se inventa un cero. |
| Buscador | `easy`, `medium` y `hard`: `/search?query=dyca` devuelve 0 resultados; en mayúsculas encuentra DYCA. | Encuentra DYCA en los cuatro modos, porque el texto se normaliza a mayúsculas antes de enviarlo. |
| Portfolio | Lecturas correctas en los cuatro modos. En `off` y `medium` la cantidad de una tenencia descuenta las acciones reservadas por una venta pendiente; en `hard` no las descuenta. | Muestra lo que devuelve la API. En `hard`, el aviso de acciones disponibles puede permitir una venta que el servidor después resuelva distinto. |
| Órdenes | `medium` y `hard` crean órdenes con status 200 en lugar de 201. En `hard`, el `status` del POST no siempre coincide con el historial (una MARKET devuelta `PENDING` figura `FILLED`; una LIMIT devuelta `FILLED` figura `PENDING`), una compra LIMIT a $ 40 quedó `FILLED` aunque el último precio era $ 45,72, y las MARKET se ejecutaron a $ 50,07 (el cierre) en vez de $ 45,72. En todos los modos acepta una LIMIT con precio 0 o negativo. | Acepta cualquier 2xx con una orden válida y muestra el `id` y el `status` que devolvió el POST, como pide el enunciado. No corrige ejecuciones ni estados del servidor. El precio 0 o negativo se rechaza antes de enviar. |
| Saldo | En los cuatro modos, una compra mayor al efectivo responde 400 `Insufficient cash`. | Avisa antes de enviar con el costo y el efectivo disponible, y no envía. |

En estas corridas no hubo errores HTTP, timeouts ni respuestas lentas (la lectura más lenta tardó 483 ms). Esos casos están cubiertos por las pruebas locales y por un proxy de prueba que los fuerza: 503, timeout, conexión cortada, respuesta ilegible y caída del historial.

## Decisiones técnicas

- **Expo y expo-router:** simplifican la preparación y ejecución local. Se parte de la plantilla oficial y se retiran sus demos.
- **Organización por feature:** el código específico de cada función se agrupa en `src/features/markets` (Mercado y búsqueda), `portfolio` y `orders`. Dentro de cada feature, el código se divide por responsabilidad en `api`, `components`, `hooks`, `screens`, `types` y `utils`, solo las que hagan falta. Las pruebas de un archivo van al lado de ese archivo, y las que prueban varias piezas juntas van en `__tests__`.
- **Código compartido:** `src/app` contiene solo rutas y provider; `src/lib` tiene la instancia HTTP, los errores, la lectura validada y la política de reintentos; `src/components`, `src/hooks` y `src/utils` tienen lo común de interfaz y utilidades; `src/config` contiene la configuración. Las dependencias van en una sola dirección: lo compartido no conoce a las features, las features no se importan entre sí y las rutas las conectan. El lint rechaza las importaciones que rompen esa regla.
- **axios:** reutiliza transporte, timeout y cancelación. Los headers fijos se configuran en una instancia compartida.
- **TanStack Query:** gestiona los datos del servidor y se conecta en la raíz con un cliente estable. Las claves, invalidación y políticas se definen junto con cada función.
- **State management:** cada tipo de estado vive donde corresponde, sin una librería de estado global. Los datos del servidor (instrumentos, búsqueda y portfolio) están en TanStack Query, con caché por clave, reintentos de lectura y actualización al enfocar. Lo que es de una pantalla o formulario, como el texto del buscador o los campos del modal, es estado local con `useState`. El envío de órdenes es un store propio fuera de React, leído con `useSyncExternalStore`; hay una sola instancia para toda la app, así que el candado contra envíos duplicados es único aunque el modal se abra y cierre. La intención de una orden en curso se persiste con AsyncStorage. No se usa Redux ni un Context global, porque no hay estado de cliente compartido entre pantallas que lo justifique.
- **Zod y fallos parciales:** validar el contenedor y cada instrumento. Una acción identificable con precio inválido conserva su fila y muestra el dato como no disponible; no se inventan ceros ni retornos. Un registro sin identidad se omite con aviso. La corrupción total es error, no lista vacía.
- **Actualización por eventos:** al entrar/volver a Mercado, reactivar la app y deslizar para actualizar. Sin polling ni calendario de mercado para esta app de prueba. Se conserva una captura en memoria mientras se consulta, señalando fallos de actualización. La hora mostrada es la última consulta exitosa, no la hora de la cotización. No se promete un feed en tiempo real.
- **Reintentos acotados:** solo Mercado reintenta red, timeout y HTTP 500/502/503/504 hasta dos veces, con exponential backoff y full jitter. Errores 4xx o datos inválidos requieren intervención. Desuscribir la consulta fuera de foco detiene reintentos pendientes y permite cancelar respuestas obsoletas. Actualizaciones simultáneas comparten la solicitud.
- **Buscador:** va dentro de Mercado porque `/search` devuelve los mismos instrumentos, y usa ese endpoint en lugar de filtrar en el cliente. El texto se normaliza a mayúsculas, porque en los modos con fallas la API no encuentra minúsculas. Un debounce de 300 ms reduce los pedidos a uno por pausa. Cada texto tiene su propia clave de caché, así que una respuesta vieja no puede pisar a la nueva. Al cambiar de texto, TanStack aborta el pedido anterior mediante el `signal` que recibe axios, lo que ahorra red.
- **Portfolio:** valor de mercado = `quantity * last_price`; ganancia = `(last_price - avg_cost_price) * quantity`; rendimiento = `(last_price - avg_cost_price) / avg_cost_price * 100`. Si falta un dato, solo los valores que dependen de él se muestran como no disponibles; nunca se inventa un cero. Una tenencia sin ticker se identifica por su `instrument_id`, sin cruzar con otra respuesta para no mezclar precios de momentos distintos.
- **Instrumentos y cálculos:** Mercado y la búsqueda muestran todos los instrumentos que devuelve la API, incluida la fila ARS de tipo `MONEDA`, como pide el enunciado. Retorno = `(last_price - close_price) / close_price * 100`, con entradas positivas/finitas y resultado finito. Number se utiliza para este porcentaje informativo. Redondear solo al presentar.
- **Cantidad por monto en pesos:** el monto y el último precio se leen como texto y se pasan a centavos enteros sin multiplicar decimales, porque `1.15 * 100` da `114.99999999999999`. La cantidad es la división entera de los centavos. Se acepta `,` o `.` y hasta 2 decimales; un monto o precio inválido se informa en vez de redondearse. Se usa el último precio también en `LIMIT`, porque el enunciado no distingue.
- **Envío de órdenes sin idempotencia:** se comprobó contra la API que no reconoce ninguna clave de idempotencia (`Idempotency-Key`, `X-Idempotency-Key`, `X-Request-Id`, `client_order_id` ni `idempotency_key`): enviar dos veces crea dos órdenes. Por eso la app:
  - envía cada orden como máximo una vez y nunca reintenta el POST;
  - bloquea un segundo envío en el mismo instante con un candado síncrono, no solo desactivando el botón;
  - permite una sola orden en curso: si el resultado queda incierto, no se puede enviar otra hasta confirmarlo;
  - trata un 4xx (menos 408) como rechazo seguro y muestra el mensaje de la API; un timeout, una caída de red, un 408, un 5xx o una respuesta 2xx ilegible dejan el resultado incierto (en los modos `medium` y `hard` la API crea órdenes con 200 en lugar de 201);
  - reconcilia un resultado incierto con `GET /orders`: antes de enviar guarda los `id` existentes, y después busca una orden nueva con el mismo instrumento, lado, tipo y cantidad, y el mismo precio solo en `LIMIT` (en `MARKET` la API devuelve el precio de ejecución);
  - guarda la intención en el dispositivo con AsyncStorage antes del POST, con una clave por cuenta, para confirmarla al reabrir la app si se cerró durante el envío.

  Límites conocidos: dos órdenes idénticas enviadas a la vez desde otro dispositivo no se distinguen; si el servidor procesa una orden después de la consulta que no la encontró, la app la da por no registrada. La API responde 400 `Insufficient cash` cuando falta saldo, aunque el enunciado describe ese caso como `REJECTED`; la app muestra lo que responde la API.
- **Saldo y acciones antes de enviar:** el servidor valida, pero en algunos modos con fallas acepta órdenes que no debería, por ejemplo vender más acciones de las que hay. Por eso el modal compara el costo de una compra (cantidad por precio límite en `LIMIT`, o por último precio en `MARKET`, en centavos enteros) con el `cash` de `/portfolio`, que ya descuenta lo reservado, y la cantidad de una venta con la tenencia. Si no alcanza, muestra el motivo y no envía. Si falta un dato o no se puede leer, no bloquea y decide el servidor. La ruta de Mercado lee el portfolio solo mientras el modal está abierto y lo vuelve a leer después de cada orden creada.
- **UI y alcance:** lista inspirada en Binance Lite, adaptada a español/ARS, con signo además de color. Se usan FlatList y componentes nativos. El modal es una hoja nativa de iOS con «Cerrar» arriba a la izquierda. La fila de pesos no abre el modal, porque es la moneda de la cuenta.

El proyecto conserva la licencia MIT de la plantilla Expo en `LICENSE`.
