/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import type { IncomingHttpHeaders, RequestListener } from 'node:http';
import { performance } from 'node:perf_hooks';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

import { api } from '@/lib/client';
import { AppError } from '@/lib/errors';
import { startHttpServer } from '@/testing/http-server';

import { getMarket } from '../api/get-market';
import { marketQueryOptions, searchQueryOptions } from '../api/market-query';
import { normalizeTicker } from '../utils/normalize-ticker';

const originalBaseURL = api.defaults.baseURL;
const action = { id: 1, ticker: 'ALUA', name: 'Aluminio Argentino', type: 'ACCIONES', last_price: 125, close_price: 100 };

let closeServer: () => Promise<void>;
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
  const server = await startHttpServer((request, response) => {
    requests.push({ method: request.method, path: request.url, headers: request.headers });
    handler(request, response);
  });
  closeServer = server.close;
  api.defaults.baseURL = server.url;
});

afterEach(async () => {
  queryClient.clear();
  clearTimeout(delayedResponse);
  api.defaults.baseURL = originalBaseURL;
  await closeServer();
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

it('busca con el texto normalizado y codificado', async () => {
  const result = await queryClient.fetchQuery(searchQueryOptions(normalizeTicker(' dy&c ')));

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'GET', path: '/search?query=DY%26C' });
  expect(result).toEqual({ instruments: [action], omitted: 0, incomplete: 0 });
});

it('al cambiar el texto corta el pedido anterior y solo entrega el resultado nuevo', async () => {
  let markReceived = () => {};
  let markDisconnected = () => {};
  const received = new Promise<void>((resolve) => { markReceived = resolve; });
  const disconnected = new Promise<void>((resolve) => { markDisconnected = resolve; });
  handler = (request, response) => {
    if (request.url === '/search?query=D') {
      response.on('close', () => { if (!response.writableFinished) markDisconnected(); });
      markReceived();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify([action]));
  };

  const observer = new QueryObserver(queryClient, searchQueryOptions('D'));
  let unsubscribe = () => {};
  const data = new Promise((resolve) => {
    unsubscribe = observer.subscribe((result) => { if (result.data) resolve(result.data); });
  });

  await received;
  observer.setOptions(searchQueryOptions('DYC'));
  await disconnected;

  await expect(data).resolves.toEqual({ instruments: [action], omitted: 0, incomplete: 0 });
  expect(queryClient.getQueryData(searchQueryOptions('D').queryKey)).toBeUndefined();
  expect(requests.map((request) => request.path)).toEqual(['/search?query=D', '/search?query=DYC']);
  unsubscribe();
});
