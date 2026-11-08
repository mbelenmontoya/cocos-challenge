/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import { createServer, type IncomingHttpHeaders, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import { QueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { AppError } from '@/api/errors';

import { getMarket } from './api';
import { marketQueryOptions } from './market-query';

const originalBaseURL = api.defaults.baseURL;
const action = { id: 1, ticker: 'ALUA', name: 'Aluminio Argentino', type: 'ACCIONES', last_price: 125, close_price: 100 };

let server: Server;
let handler: RequestListener;
let requests: { method?: string; path?: string; headers: IncomingHttpHeaders }[];
let queryClient: QueryClient;
let delayedResponse: ReturnType<typeof setTimeout> | undefined;

beforeEach(async () => {
  requests = [];
  queryClient = new QueryClient();
  delayedResponse = undefined;
  handler = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify([action]));
  };
  server = createServer((request, response) => {
    requests.push({ method: request.method, path: request.url, headers: request.headers });
    handler(request, response);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  api.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  queryClient.clear();
  clearTimeout(delayedResponse);
  api.defaults.baseURL = originalBaseURL;
  server.closeAllConnections();
  if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

it('envía método/ruta/headers por HTTP y convierte la respuesta en instrumentos', async () => {
  const result = await getMarket(new AbortController().signal);

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    method: 'GET',
    path: '/instruments',
    headers: { 'x-enable-bugs': 'off', 'x-candidate-id': 'market-flow-tests' },
  });
  expect(result).toEqual({ instruments: [action], omitted: 0, incomplete: 0 });
});

it('clasifica HTML según el status y no expone el cuerpo técnico', async () => {
  handler = (_request, response) => {
    const rejectedByServer = requests.length === 1;
    response.writeHead(rejectedByServer ? 403 : 200, { 'Content-Type': 'text/html' });
    response.end(rejectedByServer ? '<html>Private gateway diagnostics</html>' : '<html>Unexpected page</html>');
  };

  const forbidden = getMarket(new AbortController().signal);
  await expect(forbidden).rejects.toBeInstanceOf(AppError);
  await expect(forbidden).rejects.toMatchObject({ code: 'http', status: 403, retryable: false, message: 'No se pudo completar la solicitud (HTTP 403).', cause: { response: { status: 403, data: '<html>Private gateway diagnostics</html>' } } });

  await expect(getMarket(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response', retryable: false });
  expect(requests).toHaveLength(2);
});

it('el timeout de producción interrumpe una respuesta que llega demasiado tarde', async () => {
  handler = (_request, response) => {
    delayedResponse = setTimeout(() => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify([action]));
    }, 15_000);
  };

  const startedAt = performance.now();
  await expect(getMarket(new AbortController().signal)).rejects.toMatchObject({ code: 'timeout', retryable: true });
  const elapsed = performance.now() - startedAt;
  expect(elapsed).toBeGreaterThanOrEqual(9_500);
  expect(elapsed).toBeLessThan(12_000);
  expect(requests).toHaveLength(1);
}, 20_000);

it('reintenta fallos transitorios de red y HTTP como máximo dos veces', async () => {
  handler = (request, response) => {
    if (requests.length === 1) {
      request.socket.destroy();
      return;
    }
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Unavailable' }));
  };

  await expect(queryClient.fetchQuery(marketQueryOptions)).rejects.toMatchObject({ code: 'http', status: 503 });
  expect(requests).toHaveLength(3);
});
