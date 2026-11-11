import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as api from '../api/orders-api';
import type { Order, OrderAccount } from '../types/order';
import { OrderModal } from './order-modal';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../api/orders-api', () => ({ postOrder: jest.fn(), getOrders: jest.fn() }));

type OrdersApi = { postOrder: jest.Mock; getOrders: jest.Mock };
const ordersApi = api as unknown as OrdersApi;

const dyca = { id: 1, ticker: 'DYCA', last_price: 45.72 };
const order = (overrides: Partial<Order> = {}): Order => ({ id: 7, instrument_id: 1, side: 'BUY', type: 'MARKET', quantity: 1, price: 45.72, status: 'FILLED', ...overrides });

// The submitter is shared by the whole app, so a stored intent from one test must not reach the next.
beforeEach(async () => {
  await AsyncStorage.clear();
  ordersApi.getOrders.mockReset().mockResolvedValue([]);
  ordersApi.postOrder.mockReset().mockResolvedValue({ kind: 'created', order: order() });
});

async function open(account?: OrderAccount) {
  await render(<OrderModal instrument={dyca} account={account} onClose={jest.fn()} />);
  return ordersApi;
}

const typeInto = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const send = () => fireEvent.press(screen.getByRole('button', { name: 'Enviar orden' }));

it('calcula por monto y vacía el campo al pasar a acciones', async () => {
  await open();
  await choose('Monto en pesos');
  await typeInto('Monto a invertir', '100');
  expect(screen.getByText('Se enviarán 2 acciones')).toBeOnTheScreen();

  await choose('Acciones');
  expect(screen.getByLabelText('Cantidad de acciones')).toHaveDisplayValue('');
  await send();

  expect(screen.getByText('Ingresá una cantidad entera mayor que cero.')).toBeOnTheScreen();
  expect(ordersApi.postOrder).not.toHaveBeenCalled();
});

it('pide el precio solo en limit y lo envía en el cuerpo', async () => {
  await open();
  expect(screen.queryByLabelText('Precio límite')).not.toBeOnTheScreen();

  await choose('Limit');
  await typeInto('Cantidad de acciones', '1');
  await send();
  expect(screen.getByText('Ingresá un precio mayor que cero, con hasta 2 decimales.')).toBeOnTheScreen();
  expect(ordersApi.postOrder).not.toHaveBeenCalled();

  await typeInto('Precio límite', '84,5');
  await send();
  expect(ordersApi.postOrder).toHaveBeenCalledWith({ instrument_id: 1, side: 'BUY', type: 'LIMIT', quantity: 1, price: 84.5 });
});

it('no envía una compra que supera el efectivo', async () => {
  await open({ cash: 91.43, heldShares: 0 });
  await typeInto('Cantidad de acciones', '2');

  expect(screen.getByText(/^Saldo insuficiente: la orden cuesta \$\s91,44 y tenés \$\s91,43 disponibles\.$/)).toBeOnTheScreen();
  await send();
  expect(ordersApi.postOrder).not.toHaveBeenCalled();
});

it('no envía una venta mayor a la tenencia', async () => {
  await open({ cash: 0, heldShares: 1 });
  await choose('Vender');
  await typeInto('Cantidad de acciones', '2');

  expect(screen.getByText('Tenés 1 acción disponible para vender.')).toBeOnTheScreen();
  await send();
  expect(ordersApi.postOrder).not.toHaveBeenCalled();
});

it('desactiva el envío mientras espera y no manda dos veces', async () => {
  await open();
  let answer: (value: unknown) => void = () => undefined;
  ordersApi.postOrder.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  await typeInto('Cantidad de acciones', '1');
  await send();
  await send();

  expect(screen.getByRole('button', { name: 'Enviar orden' })).toBeDisabled();
  expect(ordersApi.postOrder).toHaveBeenCalledTimes(1);

  answer({ kind: 'created', order: order() });
  expect(await screen.findByText('Orden #7: FILLED')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Enviar orden' })).toBeEnabled();
});

it.each([
  ['creada', (mocks: OrdersApi) => mocks.postOrder.mockResolvedValue({ kind: 'created', order: order() }), 'Orden #7: FILLED'],
  ['confirmada por historial', (mocks: OrdersApi) => {
    mocks.postOrder.mockResolvedValue({ kind: 'uncertain' });
    mocks.getOrders.mockResolvedValueOnce([]).mockResolvedValueOnce([order({ id: 9 })]);
  }, 'Orden #9: FILLED. Confirmada por historial.'],
  ['rechazada', (mocks: OrdersApi) => mocks.postOrder.mockResolvedValue({ kind: 'rejected', message: 'Insufficient cash' }), 'Insufficient cash'],
  ['no enviada', (mocks: OrdersApi) => mocks.getOrders.mockRejectedValue(new Error('down')), 'No pudimos preparar la orden. No se envió.'],
  ['incierta', (mocks: OrdersApi) => {
    mocks.postOrder.mockResolvedValue({ kind: 'uncertain' });
    mocks.getOrders.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('down'));
  }, 'No pudimos confirmar tu orden. No la vuelvas a enviar.'],
  ['no registrada', (mocks: OrdersApi) => mocks.postOrder.mockResolvedValue({ kind: 'uncertain' }), 'La orden no se registró.'],
])('muestra el resultado de una orden %s', async (_name, arrange, message) => {
  await open();
  arrange(ordersApi);
  await typeInto('Cantidad de acciones', '1');
  await send();

  expect(await screen.findByText(message)).toBeOnTheScreen();
});

it.each([
  ['FILLED', 'Ejecutada.', '#147644'],
  ['PENDING', 'Pendiente: se ejecuta si el precio llega al límite.', '#636E7C'],
  ['REJECTED', 'Rechazada: no cumple los requisitos, por ejemplo si el monto supera tu saldo.', '#B32632'],
] as const)('explica el estado %s con su color', async (status, explanation, color) => {
  await open();
  ordersApi.postOrder.mockResolvedValue({ kind: 'created', order: order({ status }) });
  await typeInto('Cantidad de acciones', '1');
  await send();

  expect(await screen.findByText(`Orden #7: ${status}`)).toHaveStyle({ color });
  expect(screen.getByText(explanation)).toHaveStyle({ color });
});

it.each([
  ['la cantidad', () => typeInto('Cantidad de acciones', '2')],
  ['el tipo', () => choose('Limit')],
  ['el lado', () => choose('Vender')],
  ['el modo', () => choose('Monto en pesos')],
])('limpia el resultado anterior al cambiar %s', async (_name, edit) => {
  await open();
  await typeInto('Cantidad de acciones', '1');
  await send();
  expect(await screen.findByText('Orden #7: FILLED')).toBeOnTheScreen();

  await edit();

  expect(screen.queryByText('Orden #7: FILLED')).not.toBeOnTheScreen();
  expect(screen.queryByText('Ejecutada.')).not.toBeOnTheScreen();
});

it('mantiene el aviso de orden sin confirmar aunque se edite el formulario', async () => {
  await open();
  ordersApi.postOrder.mockResolvedValue({ kind: 'uncertain' });
  ordersApi.getOrders.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('down'));
  await typeInto('Cantidad de acciones', '1');
  await send();
  expect(await screen.findByText('No pudimos confirmar tu orden. No la vuelvas a enviar.')).toBeOnTheScreen();

  await typeInto('Cantidad de acciones', '3');

  expect(screen.getByText('No pudimos confirmar tu orden. No la vuelvas a enviar.')).toBeOnTheScreen();
});
