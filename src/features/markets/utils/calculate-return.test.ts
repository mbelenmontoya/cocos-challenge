import { calculateReturn } from './calculate-return';
import { parseInstruments } from './parse-instruments';

const action = { id: 1, ticker: 'ALUA', name: 'Aluminio Argentino', type: 'ACCIONES', last_price: 125, close_price: 100 };

it('calcula el retorno con el signo y la precisión esperados', () => {
  const cases = [
    { last_price: 125, close_price: 100, expected: 25 },
    { last_price: 125, close_price: 200, expected: -37.5 },
    { last_price: 10, close_price: 3, expected: 233.3333333333 },
  ];

  for (const input of cases) {
    const [instrument] = parseInstruments([{ ...action, ...input }]).instruments;
    expect(calculateReturn(instrument)).toBeCloseTo(input.expected, 10);
  }
});
