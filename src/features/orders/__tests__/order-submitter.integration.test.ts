/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import type { ServerResponse } from 'node:http';

import { api } from '@/lib/client';
import { startHttpServer } from '@/testing/http-server';

import { getOrders, postOrder } from '../api/orders-api';
import type { OrderBody } from '../types/order';
import { createOrderSubmitter, type Intent, type IntentStorage } from '../utils/order-submitter';

type PostMode = 'create' | 'reject' | '503' | 'create-then-503' | 'create-then-hang' | 'others-then-503';
type StoredOrder = Omit<OrderBody, 'price'> & { id: number; price: number | null; status: string };

const originalBaseURL = api.defaults.baseURL;
const originalTimeout = api.defaults.timeout;
const market: OrderBody = { instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 2 };
const limit: OrderBody = { instrument_id: 1, side: 'SELL', type: 'LIMIT', quantity: 3, price: 40.5 };

let close: () => Promise<void>;
let orders: StoredOrder[];
let posts: number;
let postMode: PostMode;
let ordersDown: boolean;
let saved: Intent | null;
let savedWhenPosted: Intent | null | undefined;
let writeFails: boolean;
let hanging: ServerResponse[];

const storage: IntentStorage = {
  read: async () => saved,
  write: async (intent) => {
    if (writeFails) throw new Error('disk full');
    saved = intent;
  },
  clear: async () => { saved = null; },
};

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const createOrder = (body: OrderBody): StoredOrder => {
  const order = { ...body, id: 1000 + orders.length * 7919, price: body.type === 'MARKET' ? 45.72 : body.price ?? null, status: body.type === 'MARKET' ? 'FILLED' : 'PENDING' };
  orders.push(order);
  return order;
};

const newSubmitter = () => createOrderSubmitter({ postOrder, getOrders, storage });

beforeEach(async () => {
  orders = [];
  posts = 0;
  postMode = 'create';
  ordersDown = false;
  saved = null;
  savedWhenPosted = undefined;
  writeFails = false;
  hanging = [];
  api.defaults.timeout = 300;
  const server = await startHttpServer((request, response) => {
    let raw = '';
    request.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    request.on('end', () => {
      if (request.method === 'GET') {
        if (ordersDown) json(response, 503, { error: 'down' });
        else json(response, 200, orders);
        return;
      }
      posts += 1;
      savedWhenPosted = saved;
      const body = JSON.parse(raw) as OrderBody;
      if (postMode === 'reject') json(response, 400, { error: 'Insufficient cash' });
      else if (postMode === '503') json(response, 503, { error: 'down' });
      else if (postMode === 'create-then-503') { createOrder(body); json(response, 503, { error: 'down' }); }
      else if (postMode === 'create-then-hang') { createOrder(body); hanging.push(response); }
      else if (postMode === 'others-then-503') {
        createOrder({ ...body, side: body.side === 'BUY' ? 'SELL' : 'BUY' });
        createOrder({ ...body, quantity: body.quantity + 1 });
        createOrder({ ...body, instrument_id: body.instrument_id + 1 });
        createOrder({ ...body, type: 'LIMIT', price: 45.72 });
        json(response, 503, { error: 'down' });
      }
      else json(response, 201, createOrder(body));
    });
  });
  close = server.close;
  api.defaults.baseURL = server.url;
});

afterEach(async () => {
  hanging.forEach((response) => response.destroy());
  api.defaults.baseURL = originalBaseURL;
  api.defaults.timeout = originalTimeout;
  await close();
});

it('dos envíos en el mismo instante mandan un solo POST', async () => {
  const submitter = newSubmitter();

  await Promise.all([submitter.submit(market), submitter.submit(market)]);

  expect(posts).toBe(1);
  expect(orders).toHaveLength(1);
});

it('guarda la intención con los ids previos antes del POST y la borra al crear la orden', async () => {
  createOrder(limit);
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(savedWhenPosted).toEqual({ body: market, knownIds: [orders[0].id] });
  expect(saved).toBeNull();
  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[1].id, status: 'FILLED' }), confirmedByHistory: false });
});

it('un rechazo muestra el mensaje de la API y borra la intención', async () => {
  postMode = 'reject';
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(submitter.getState()).toEqual({ kind: 'rejected', message: 'Insufficient cash' });
  expect(saved).toBeNull();
});

it('si no puede leer el historial antes de enviar, no envía nada', async () => {
  ordersDown = true;
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(submitter.getState()).toEqual({ kind: 'not_sent' });
  expect(posts).toBe(0);
});

it('si no puede guardar la intención, no envía nada', async () => {
  writeFails = true;
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(submitter.getState()).toEqual({ kind: 'not_sent' });
  expect(posts).toBe(0);
});

it('tras un timeout encuentra la orden market en el historial aunque tenga precio de ejecución', async () => {
  postMode = 'create-then-hang';
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[0].id, price: 45.72 }), confirmedByHistory: true });
  expect(saved).toBeNull();
  expect(posts).toBe(1);
});

it('tras un 503 sin orden nueva informa que no se registró y desbloquea', async () => {
  postMode = '503';
  const submitter = newSubmitter();

  await submitter.submit(market);
  expect(submitter.getState()).toEqual({ kind: 'not_created' });
  expect(saved).toBeNull();

  postMode = 'create';
  await submitter.submit(market);
  expect(posts).toBe(2);
});

it('no toma como nueva una orden idéntica que ya existía', async () => {
  createOrder(limit);
  postMode = '503';
  const submitter = newSubmitter();

  await submitter.submit(limit);

  expect(submitter.getState()).toEqual({ kind: 'not_created' });
});

it('no toma como suya una orden nueva con otro instrumento, lado, tipo o cantidad', async () => {
  postMode = 'others-then-503';
  const submitter = newSubmitter();

  await submitter.submit(market);

  expect(orders).toHaveLength(4);
  expect(submitter.getState()).toEqual({ kind: 'not_created' });
});

it('en una orden limit compara también el precio', async () => {
  postMode = 'create-then-503';
  const submitter = newSubmitter();

  await submitter.submit(limit);
  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ price: 40.5 }), confirmedByHistory: true });

  orders.length = 0;
  saved = { body: { ...limit, price: 41 }, knownIds: [] };
  createOrder(limit);
  await submitter.resume();
  expect(submitter.getState()).toEqual({ kind: 'not_created' });
});

it('si no puede verificar, queda incierta y no deja enviar otra hasta reconciliar', async () => {
  postMode = 'create-then-hang';
  const submitter = newSubmitter();
  const reconcileFails = submitter.submit(market);
  setTimeout(() => { ordersDown = true; }, 50);
  await reconcileFails;

  expect(submitter.getState()).toEqual({ kind: 'uncertain' });
  expect(saved).toEqual(expect.objectContaining({ body: market }));

  await submitter.submit(limit);
  expect(posts).toBe(1);
  expect(submitter.getState()).toEqual({ kind: 'uncertain' });

  ordersDown = false;
  await submitter.submit(limit);
  expect(posts).toBe(1);
  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[0].id }), confirmedByHistory: true });
  expect(saved).toBeNull();
});

it('al reabrir reconcilia una intención guardada sin enviar', async () => {
  createOrder(market);
  saved = { body: market, knownIds: [] };

  const submitter = newSubmitter();
  await submitter.resume();

  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[0].id }), confirmedByHistory: true });
  expect(posts).toBe(0);
});

it('si no puede borrar la intención, igual muestra el resultado y la próxima vez la vuelve a confirmar', async () => {
  const failingClear = { ...storage, clear: () => Promise.reject(new Error('disk')) };
  const submitter = createOrderSubmitter({ postOrder, getOrders, storage: failingClear });

  await submitter.submit(market);
  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[0].id }), confirmedByHistory: false });

  await submitter.submit(market);
  expect(posts).toBe(1);
  expect(submitter.getState()).toEqual({ kind: 'created', order: expect.objectContaining({ id: orders[0].id }), confirmedByHistory: true });
});

it('si no puede leer el dispositivo al reabrir, no cambia nada ni envía', async () => {
  const failingRead = { ...storage, read: () => Promise.reject(new Error('disk')) };
  const submitter = createOrderSubmitter({ postOrder, getOrders, storage: failingRead });

  await expect(submitter.resume()).resolves.toBeUndefined();
  expect(submitter.getState()).toEqual({ kind: 'idle' });
  expect(posts).toBe(0);
});

it('avisa a quien escucha cada cambio de estado', async () => {
  const submitter = newSubmitter();
  const seen: string[] = [];
  submitter.subscribe(() => seen.push(submitter.getState().kind));

  await submitter.submit(market);

  expect(seen).toEqual(['sending', 'created']);
});
