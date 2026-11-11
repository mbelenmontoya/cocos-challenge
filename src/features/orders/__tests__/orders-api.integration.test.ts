/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import type { IncomingHttpHeaders, RequestListener } from 'node:http';

import { api } from '@/lib/client';
import { startHttpServer } from '@/testing/http-server';

import { getOrders, postOrder } from '../api/orders-api';

const created = { id: 905868, candidate_id: 'x', instrument_id: 1, side: 'SELL', type: 'LIMIT', quantity: 123, price: 84.5, status: 'PENDING', created_at: '2026-11-10T14:27:41.578Z' };
const originalBaseURL = api.defaults.baseURL;
const originalTimeout = api.defaults.timeout;

let close: () => Promise<void>;
let handler: RequestListener;
let requests: { method?: string; path?: string; headers: IncomingHttpHeaders; body: string }[];
let delayed: ReturnType<typeof setTimeout> | undefined;

const reply = (status: number, body: unknown, contentType = 'application/json'): RequestListener => (_request, response) => {
  response.writeHead(status, { 'Content-Type': contentType });
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
};

beforeEach(async () => {
  requests = [];
  handler = reply(201, created);
  const server = await startHttpServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    request.on('end', () => {
      requests.push({ method: request.method, path: request.url, headers: request.headers, body });
      handler(request, response);
    });
  });
  close = server.close;
  api.defaults.baseURL = server.url;
});

afterEach(async () => {
  clearTimeout(delayed);
  api.defaults.baseURL = originalBaseURL;
  api.defaults.timeout = originalTimeout;
  await close();
});

it('envía el cuerpo exacto y devuelve el id y el status creados', async () => {
  const result = await postOrder({ instrument_id: 1, side: 'SELL', type: 'LIMIT', quantity: 123, price: 84.5 });

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'POST', path: '/orders', headers: { 'x-candidate-id': 'market-flow-tests', 'x-enable-bugs': 'off' } });
  expect(requests[0].body).toBe('{"instrument_id":1,"side":"SELL","type":"LIMIT","quantity":123,"price":84.5}');
  expect(result).toEqual({ kind: 'created', order: expect.objectContaining({ id: 905868, status: 'PENDING' }) });
});

it('envía una orden market sin precio', async () => {
  await postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1234 });

  expect(requests[0].body).toBe('{"instrument_id":1,"side":"BUY","type":"MARKET","quantity":1234}');
});

it('un 400 es un rechazo con el mensaje de la API', async () => {
  handler = reply(400, { error: 'Insufficient cash' });

  await expect(postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 })).resolves.toEqual({ kind: 'rejected', message: 'Insufficient cash' });
});

it('un 400 sin mensaje legible usa un texto propio', async () => {
  handler = reply(400, '<html></html>', 'text/html');

  const result = await postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 });
  expect(result.kind).toBe('rejected');
  expect(result.kind === 'rejected' && result.message).toBe('No se pudo completar la solicitud (HTTP 400).');
});

it.each([
  ['un 503', reply(503, { error: 'down' })],
  ['un 408', reply(408, { error: 'timeout' })],
  ['un 201 que no es una orden', reply(201, '<html></html>', 'text/html')],
  ['una conexión cortada', ((request) => { request.socket.destroy(); }) as RequestListener],
])('%s deja el resultado incierto y no reintenta', async (_name, listener) => {
  handler = listener;

  await expect(postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 })).resolves.toEqual({ kind: 'uncertain' });
  expect(requests).toHaveLength(1);
});

it('un timeout deja el resultado incierto y no reintenta', async () => {
  api.defaults.timeout = 200;
  handler = (_request, response) => {
    delayed = setTimeout(() => reply(201, created)(_request, response), 1_000);
  };

  await expect(postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 })).resolves.toEqual({ kind: 'uncertain' });
  expect(requests).toHaveLength(1);
});

it('lee el historial de órdenes', async () => {
  handler = reply(200, [created, { ...created, id: 7, type: 'MARKET', price: 45.72, status: 'FILLED' }]);

  const orders = await getOrders();
  expect(requests[0]).toMatchObject({ method: 'GET', path: '/orders' });
  expect(orders.map((order) => order.id)).toEqual([905868, 7]);
});

it('un historial con una orden ilegible es un error', async () => {
  handler = reply(200, [created, { id: 'x' }]);

  await expect(getOrders()).rejects.toMatchObject({ code: 'invalid_response' });
});

it.each([
  ['un 500', reply(500, { error: 'boom' })],
  ['un 302 sin destino', reply(302, '')],
])('%s tampoco es un rechazo seguro', async (_name, listener) => {
  handler = listener;

  await expect(postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 })).resolves.toEqual({ kind: 'uncertain' });
  expect(requests).toHaveLength(1);
});
