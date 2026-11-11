import AsyncStorage from '@react-native-async-storage/async-storage';

import { pendingIntentStorage } from './pending-intent-storage';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const key = 'orders:pending-intent:https://cocos.test:market-flow-tests';
const intent = { body: { instrument_id: 1, side: 'BUY' as const, type: 'MARKET' as const, quantity: 2 }, knownIds: [7, 9] };

beforeEach(() => AsyncStorage.clear());

it('guarda, lee y borra la intención con una clave por cuenta', async () => {
  await pendingIntentStorage.write(intent);
  expect(JSON.parse((await AsyncStorage.getItem(key)) ?? 'null')).toEqual(intent);
  await expect(pendingIntentStorage.read()).resolves.toEqual(intent);

  await pendingIntentStorage.clear();
  await expect(pendingIntentStorage.read()).resolves.toBeNull();
});

it.each(['no es json', '{"body":{"instrument_id":1},"knownIds":[]}', '{"body":{"instrument_id":1,"side":"BUY","type":"MARKET","quantity":2},"knownIds":"7"}'])(
  'lee como vacía una intención guardada inválida: %s',
  async (value) => {
    await AsyncStorage.setItem(key, value);
    await expect(pendingIntentStorage.read()).resolves.toBeNull();
  },
);

it('no lee la intención guardada por otra cuenta', async () => {
  await AsyncStorage.setItem('orders:pending-intent:https://cocos.test:otra-cuenta', JSON.stringify(intent));
  await expect(pendingIntentStorage.read()).resolves.toBeNull();
});
