# Pruebas de punta a punta

Flujos de [Maestro](https://docs.maestro.dev) que manejan la app real en el simulador iOS, contra la API de Cocos a través de un proxy local.

## Requisitos

- macOS con un simulador iOS encendido y Expo Go instalado en él (se instala la primera vez que se corre `npm run ios`).
- Maestro instalado.
- Los puertos 8081 (Metro) y 8099 (proxy) libres.

## Cómo correrlos

```sh
npm run test:e2e
```

El script levanta el proxy y Metro, corre cada flujo, verifica cuántas órdenes llegaron al servidor y apaga solo lo que inició. Usa una cuenta descartable nueva en cada corrida, así que no toca la cuenta de `.env`. Tarda varios minutos, porque algunos flujos esperan el timeout de 10 segundos.

## El proxy

`proxy.mjs` reenvía todo a la API real con la cuenta descartable, y cambia de comportamiento con `GET /__mode/<modo>`:

| Modo | Qué hace |
|---|---|
| `normal` | Reenvía sin cambios. |
| `delay-post` | Crea la orden en la API pero responde a los 12 s, después del timeout de la app. |
| `delay-post-then-down` | Igual que `delay-post`, y además hace fallar `GET /orders`. |
| `post-503` | Responde 503 sin crear la orden. |
| `post-400` | Responde 400 `Insufficient cash` sin crear la orden. |
| `post-garbage` | Crea la orden y responde 201 con HTML. |
| `orders-down` | `GET /orders` responde 503. |
| `null-price` | DYCA llega sin último precio. |

También expone `/__reset` (reinicia la cuenta y los contadores), `/__posts`, `/__bodies`, `/__orders` y `/__portfolio` para comprobar lo que llegó al servidor.

## Qué cubren

Compra MARKET y LIMIT; doble toque; timeout con la orden confirmada por historial; resultado incierto que bloquea otra orden hasta confirmarse; cierre de la app con la orden en camino; rechazo 400; 503 sin orden; respuesta ilegible; historial caído antes de enviar; validación de cantidad, monto y precio; cambio de modo; instrumento sin precio; avisos de saldo y de acciones; buscador; cambio de instrumento; cerrar el modal durante el envío; Portfolio después de comprar; y la fila de pesos, que no abre el modal.
