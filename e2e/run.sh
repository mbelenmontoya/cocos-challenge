#!/usr/bin/env bash
# Runs every E2E flow on the booted iOS simulator through the local test proxy.
# It starts the proxy and Metro itself and stops only the processes it started.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"
PROXY="http://127.0.0.1:8099"
OUT="${TMPDIR:-/tmp}/cocos-e2e-$(date +%s)"
CANDIDATE="e2e-$(date +%s)"
MAESTRO="$(command -v maestro || echo "$HOME/.maestro/bin/maestro")"
PIDS=()

fail_setup() { echo "No se puede correr: $1" >&2; exit 2; }
[ -x "$MAESTRO" ] || fail_setup "falta Maestro (https://docs.maestro.dev)."
xcrun simctl list devices booted | grep -q Booted || fail_setup "no hay un simulador iOS encendido."
lsof -ti:8081 -sTCP:LISTEN >/dev/null && fail_setup "el puerto 8081 está ocupado; cerrá Metro antes de correr los E2E."
lsof -ti:8099 -sTCP:LISTEN >/dev/null && fail_setup "el puerto 8099 está ocupado."

cleanup() {
  for pid in "${PIDS[@]}"; do kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null; done
}
trap cleanup EXIT

set -m
node "$E2E/proxy.mjs" "$CANDIDATE" off >"$OUT-proxy.log" 2>&1 &
PIDS+=($!)
(cd "$ROOT" && EXPO_PUBLIC_API_URL="$PROXY" CI=1 EXPO_NO_TELEMETRY=1 npx expo start --localhost --port 8081 --clear) >"$OUT-metro.log" 2>&1 &
PIDS+=($!)
set +m

curl -s --retry 60 --retry-connrefused --retry-delay 1 "$PROXY/__posts" >/dev/null || fail_setup "el proxy no arrancó."
curl -s --retry 120 --retry-connrefused --retry-delay 1 http://127.0.0.1:8081/status >/dev/null || fail_setup "Metro no arrancó."

mode() { curl -s "$PROXY/__mode/$1" >/dev/null; }
reset() { curl -s "$PROXY/__reset" >/dev/null; }
posts() { curl -s "$PROXY/__posts"; }

PASSED=0
FAILED=0
# A flow can end right after tapping send, so the count gets a few seconds to settle.
posts_reach() {
  for _ in $(seq 1 20); do [ "$(posts)" = "$1" ] && return 0; sleep 0.5; done
  return 1
}
flow() {
  local name="$1" expected="$2"
  if "$MAESTRO" test "$E2E/flows/$name.yaml" --debug-output "$OUT/$name" >"$OUT-$name.log" 2>&1 && posts_reach "$expected"; then
    PASSED=$((PASSED + 1)); echo "PASS  $name (POST: $(posts))"
  else
    FAILED=$((FAILED + 1)); echo "FAIL  $name (POST: $(posts), esperados $expected; detalle en $OUT-$name.log)"
  fi
}
# A flow on its own: fresh account, one proxy mode, expected POST count.
single() { reset; mode "$2"; flow "$1" "$3"; }

mkdir -p "$OUT"
single compra-market-y-limit normal 2
single cantidad normal 1
single monto normal 1
single limit normal 2
single venta normal 2
single saldo-y-acciones normal 2
single cambio-modo normal 0
single sin-precio null-price 1
single no-preparada orders-down 0
single 201-ilegible post-garbage 1
single buscador normal 0
single otro-instrumento normal 1
single doble-toque-y-timeout delay-post 1

single incierta-bloquea delay-post-then-down 1
mode normal; flow incierta-se-confirma 2

single rechazo-del-servidor post-400 1
mode post-503; flow servidor-caido-y-ars 2

reset; mode delay-post; flow cierre-envia 1
xcrun simctl terminate booted host.exp.Exponent
mode normal; flow cierre-reabre 1

single cerrar-enviando delay-post 1
mode normal; flow portfolio 1

echo "E2E: $PASSED pasaron, $FAILED fallaron. Capturas y registros en $OUT"
[ "$FAILED" -eq 0 ]
