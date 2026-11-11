import { maxSharesForAmount, parseExactShares, parseLimitPrice } from './order-quantity';

const ok = (shares: number) => ({ status: 'ok', shares });
const centsToText = (cents: number) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;

it('calcula la cantidad máxima con resultados conocidos', () => {
  expect(maxSharesForAmount('0,58', 0.01)).toEqual(ok(58));
  expect(maxSharesForAmount('45,72', 45.72)).toEqual(ok(1));
  expect(maxSharesForAmount('91,44', 45.72)).toEqual(ok(2));
  expect(maxSharesForAmount('91,43', 45.72)).toEqual(ok(1));
  expect(maxSharesForAmount('1000000', 45.72)).toEqual(ok(21872));
  expect(maxSharesForAmount('45,71', 45.72)).toEqual({ status: 'insufficient' });
});

it('nunca se pasa del monto ni deja sin comprar una acción que alcanza', () => {
  for (let priceCents = 1; priceCents <= 9756; priceCents += 1) {
    for (let quantity = 1; quantity <= 200; quantity += 1) {
      const amountCents = priceCents * quantity;
      const result = maxSharesForAmount(centsToText(amountCents), priceCents / 100);
      if (result.status !== 'ok') throw new Error(`${amountCents}/${priceCents}: ${result.status}`);
      if (result.shares * priceCents > amountCents || (result.shares + 1) * priceCents <= amountCents) {
        throw new Error(`${amountCents}/${priceCents}: ${result.shares}`);
      }

      const oneCentLess = maxSharesForAmount(centsToText(amountCents - 1), priceCents / 100);
      const expected = amountCents === 1 ? { status: 'invalid_amount' } : quantity === 1 ? { status: 'insufficient' } : ok(quantity - 1);
      if (JSON.stringify(oneCentLess) !== JSON.stringify(expected)) {
        throw new Error(`${amountCents - 1}/${priceCents}: ${JSON.stringify(oneCentLess)}`);
      }
    }
  }
});

it('acepta el mayor monto exacto y rechaza el centavo siguiente', () => {
  expect(maxSharesForAmount('90071992547409,91', 0.01)).toEqual(ok(Number.MAX_SAFE_INTEGER));
  expect(maxSharesForAmount('90071992547409,92', 0.01)).toEqual({ status: 'invalid_amount' });
});

it('lee un solo decimal como décimos y acepta los dos separadores', () => {
  expect(maxSharesForAmount('0,5', 0.01)).toEqual(ok(50));
  expect(maxSharesForAmount('0.5', 0.01)).toEqual(ok(50));
});

it.each(['', 'abc', '-5', '+5', '0', '0,00', ',5', '5,', '1 000', '10,999', '1.234', '1,2,3', '1e3', '１００', '99999999999999999999'])(
  'rechaza el monto %j',
  (amount) => {
    expect(maxSharesForAmount(amount, 45.72)).toEqual({ status: 'invalid_amount' });
  },
);

it('informa primero el monto inválido cuando tampoco hay precio', () => {
  expect(maxSharesForAmount('abc', null)).toEqual({ status: 'invalid_amount' });
});

it.each([null, 0, -5, 1.555, 0.001, 0.1 + 0.2, NaN, Infinity, 1e21])('no calcula con el precio %p', (price) => {
  expect(maxSharesForAmount('100', price)).toEqual({ status: 'price_unavailable' });
});

it('valida una cantidad exacta de acciones', () => {
  expect(parseExactShares('1234')).toBe(1234);
});

it.each(['', '0', '00', '-1', '+1', '1,5', '1.5', '1 0', '1e3', '0x10', 'abc', '１２', '9007199254740992'])('rechaza la cantidad %j', (text) => {
  expect(parseExactShares(text)).toBeNull();
});

it('lee el precio limit con hasta dos decimales', () => {
  expect(parseLimitPrice('84,5')).toBe(84.5);
  expect(parseLimitPrice(' 0.01 ')).toBe(0.01);
});

it.each(['', '0', '0,00', '-1', '1,555', 'abc'])('rechaza el precio limit %j', (text) => {
  expect(parseLimitPrice(text)).toBeNull();
});

it('ignora los espacios alrededor de lo que escribe el usuario', () => {
  expect(maxSharesForAmount(' 100 ', 45.72)).toEqual(ok(2));
  expect(parseExactShares(' 12 ')).toBe(12);
});
