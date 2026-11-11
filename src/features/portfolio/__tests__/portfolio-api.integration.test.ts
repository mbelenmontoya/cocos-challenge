/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import type { IncomingHttpHeaders, RequestListener } from 'node:http';

import { api } from '@/lib/client';
import { startHttpServer } from '@/testing/http-server';

import { getPortfolio } from '../api/get-portfolio';

const originalBaseURL = api.defaults.baseURL;
const body = { cash: 999954.28, holdings: [{ instrument_id: 1, ticker: 'DYCA', quantity: 1, last_price: 45.72, close_price: 50.07, avg_cost_price: 45.72 }] };

let close: () => Promise<void>;
let handler: RequestListener;
let requests: { method?: string; path?: string; headers: IncomingHttpHeaders }[];

beforeEach(async () => {
  requests = [];
  handler = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  const server = await startHttpServer((request, response) => {
    requests.push({ method: request.method, path: request.url, headers: request.headers });
    handler(request, response);
  });
  close = server.close;
  api.defaults.baseURL = server.url;
});

afterEach(async () => {
  api.defaults.baseURL = originalBaseURL;
  await close();
});

it('pide el portfolio de la cuenta y devuelve la tenencia interpretada', async () => {
  const result = await getPortfolio(new AbortController().signal);

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ method: 'GET', path: '/portfolio', headers: { 'x-candidate-id': 'market-flow-tests', 'x-enable-bugs': 'off' } });
  expect(result).toEqual({
    cash: 999954.28,
    holdings: [{ instrument_id: 1, ticker: 'DYCA', quantity: 1, last_price: 45.72, avg_cost_price: 45.72 }],
    omitted: 0,
    incomplete: 0,
  });
});

it('trata un HTML con status 200 como respuesta inválida', async () => {
  handler = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<html>Unexpected page</html>');
  };

  await expect(getPortfolio(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response', retryable: false });
});
