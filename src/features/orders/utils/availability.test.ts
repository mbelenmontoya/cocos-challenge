import type { OrderBody } from '../types/order';
import { checkAvailability } from './availability';

const buy = (quantity: number, price?: number): OrderBody => ({ instrument_id: 1, side: 'BUY', type: price === undefined ? 'MARKET' : 'LIMIT', quantity, ...(price === undefined ? {} : { price }) });
const sell = (quantity: number): OrderBody => ({ instrument_id: 1, side: 'SELL', type: 'MARKET', quantity });
const account = (cash: number | null, heldShares: number | null = 0) => ({ cash, heldShares });

it('una compra market se compara con el último precio', () => {
  expect(checkAvailability(buy(2), 45.72, account(91.44))).toEqual({ status: 'ok' });
  expect(checkAvailability(buy(2), 45.72, account(91.43))).toEqual({ status: 'insufficient_cash', cost: 91.44, cash: 91.43 });
});

it('una compra limit se compara con el precio límite', () => {
  expect(checkAvailability(buy(10, 1), 45.72, account(9.99))).toEqual({ status: 'insufficient_cash', cost: 10, cash: 9.99 });
  expect(checkAvailability(buy(10, 1), 45.72, account(10))).toEqual({ status: 'ok' });
});

it('una venta se compara con las acciones de la tenencia', () => {
  expect(checkAvailability(sell(3), 45.72, account(0, 3))).toEqual({ status: 'ok' });
  expect(checkAvailability(sell(4), 45.72, account(0, 3))).toEqual({ status: 'insufficient_shares', held: 3 });
  expect(checkAvailability(sell(1), 45.72, account(1000, 0))).toEqual({ status: 'insufficient_shares', held: 0 });
});

it('una venta no depende del efectivo ni una compra de las acciones', () => {
  expect(checkAvailability(sell(1), 45.72, account(0, 1))).toEqual({ status: 'ok' });
  expect(checkAvailability(buy(1), 45.72, account(100, 0))).toEqual({ status: 'ok' });
});

it('una cantidad enorme no alcanza en vez de calcular un costo inseguro', () => {
  expect(checkAvailability(buy(Number.MAX_SAFE_INTEGER), 45.72, account(1000000))).toMatchObject({ status: 'insufficient_cash', cash: 1000000 });
});

it.each([
  ['sin cuenta', buy(1000), 45.72, undefined],
  ['efectivo no disponible', buy(1000), 45.72, account(null)],
  ['efectivo con 3 decimales', buy(1000), 45.72, account(10.555)],
  ['market sin último precio', buy(1000), null, account(10)],
  ['cantidad de la tenencia no disponible', sell(1000), 45.72, account(0, null)],
])('deja decidir al servidor con %s', (_name, body, lastPrice, data) => {
  expect(checkAvailability(body, lastPrice, data)).toEqual({ status: 'ok' });
});
