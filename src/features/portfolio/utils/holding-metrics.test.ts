import type { Holding } from '../types/holding';
import { gain, marketValue, returnPercent } from './holding-metrics';

const holding = (quantity: number | null, last_price: number | null, avg_cost_price: number | null): Holding => ({
  instrument_id: 1, ticker: 'DYCA', quantity, last_price, avg_cost_price,
});

it('calcula valor, ganancia y rendimiento con resultados conocidos', () => {
  const cases = [
    { input: holding(3, 125, 100), value: 375, profit: 75, percent: 25 },
    { input: holding(2, 50, 80), value: 100, profit: -60, percent: -37.5 },
    { input: holding(4, 10, 10), value: 40, profit: 0, percent: 0 },
  ];

  for (const { input, value, profit, percent } of cases) {
    expect(marketValue(input)).toBe(value);
    expect(gain(input)).toBe(profit);
    expect(returnPercent(input)).toBe(percent);
  }
});

it('deja sin calcular solo los valores que dependen del dato faltante', () => {
  expect([marketValue(holding(null, 125, 100)), gain(holding(null, 125, 100)), returnPercent(holding(null, 125, 100))]).toEqual([null, null, 25]);
  expect([marketValue(holding(3, null, 100)), gain(holding(3, null, 100)), returnPercent(holding(3, null, 100))]).toEqual([null, null, null]);
  expect([marketValue(holding(3, 125, null)), gain(holding(3, 125, null)), returnPercent(holding(3, 125, null))]).toEqual([375, null, null]);
});

it('no devuelve infinitos cuando el resultado se desborda', () => {
  expect(marketValue(holding(Number.MAX_VALUE, Number.MAX_VALUE, 1))).toBeNull();
  expect(returnPercent(holding(1, Number.MAX_VALUE, Number.MIN_VALUE))).toBeNull();
});
