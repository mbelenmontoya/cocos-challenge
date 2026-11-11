/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import { getOrders, postOrder } from '@/features/orders/api/orders-api';
import { getPortfolio } from '@/features/portfolio/api/get-portfolio';
import { api } from '@/lib/client';

const originalBaseURL = api.defaults.baseURL;
const originalCandidate = api.defaults.headers['X-Candidate-Id'];
const candidate = `contract-${Date.now()}`;
const reset = () => api.post('/reset');

beforeAll(async () => {
  api.defaults.baseURL = 'https://dummy-api-topaz.vercel.app';
  api.defaults.headers['X-Candidate-Id'] = candidate;
  await reset();
});

afterAll(async () => {
  await reset();
  api.defaults.baseURL = originalBaseURL;
  api.defaults.headers['X-Candidate-Id'] = originalCandidate;
});

const toCents = (value: number) => Math.round(value * 100);

it('usa una cuenta descartable propia', async () => {
  const response = await api.get('/portfolio');
  expect(response.config.headers['X-Candidate-Id']).toBe(candidate);
});

it('una compra market queda en el historial y en el portfolio con su costo', async () => {
  const before = await getPortfolio(new AbortController().signal);
  expect(before.holdings).toEqual([]);

  const result = await postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1 });
  if (result.kind !== 'created') throw new Error(`se esperaba una orden creada: ${JSON.stringify(result)}`);
  expect(result.order).toMatchObject({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1, status: 'FILLED' });

  const history = await getOrders();
  expect(history.map((order) => order.id)).toContain(result.order.id);

  const after = await getPortfolio(new AbortController().signal);
  expect(after.holdings).toEqual([expect.objectContaining({ instrument_id: 1, quantity: 1 })]);
  expect(toCents(before.cash ?? Number.NaN) - toCents(after.cash ?? Number.NaN)).toBe(toCents(result.order.price ?? Number.NaN));
}, 30_000);

it('una compra mayor al efectivo es un rechazo con el mensaje de la API', async () => {
  await expect(postOrder({ instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 100_000_000 })).resolves.toEqual({ kind: 'rejected', message: 'Insufficient cash' });
}, 30_000);
