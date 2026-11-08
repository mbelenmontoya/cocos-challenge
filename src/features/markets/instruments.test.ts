import { calculateReturn, parseInstruments } from './instruments';

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

it('conserva las acciones utilizables y señala los datos parciales de una respuesta mixta', () => {
  const result = parseInstruments([
    action,
    { ...action, id: 2, ticker: 'ZERO', last_price: 0 },
    { ...action, id: 3, ticker: 'CLOSE', close_price: 0 },
    { ...action, id: 4, ticker: null },
    { ...action, id: 26, ticker: 'ARS', name: 'Pesos', type: 'MONEDA', last_price: 1, close_price: 1 },
  ]);

  expect(result).toMatchObject({ omitted: 1, incomplete: 2 });
  expect(result.instruments.map(({ ticker }) => ticker)).toEqual(['ALUA', 'ZERO', 'CLOSE']);
  expect(calculateReturn(result.instruments[0])).toBe(25);
  expect(calculateReturn(result.instruments[1])).toBeNull();
  expect(result.instruments[2].last_price).toBe(125);
  expect(calculateReturn(result.instruments[2])).toBeNull();
});

it('distingue un catálogo vacío válido de una respuesta totalmente corrupta', () => {
  expect(parseInstruments([])).toMatchObject({ instruments: [], omitted: 0, incomplete: 0 });
  expect(() => parseInstruments([null, { ticker: '' }])).toThrow();
});
