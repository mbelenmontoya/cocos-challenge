import { parsePortfolio } from './parse-portfolio';

const holding = { instrument_id: 1, ticker: 'DYCA', quantity: 3, last_price: 125, close_price: 120, avg_cost_price: 100 };

it('conserva las filas identificables y omite las que no tienen identidad', () => {
  const result = parsePortfolio({
    cash: 1000,
    holdings: [
      holding,
      { ...holding, instrument_id: 7, ticker: undefined },
      { ...holding, instrument_id: 8, avg_cost_price: 0 },
      { ...holding, instrument_id: undefined },
    ],
  });

  expect(result).toMatchObject({ omitted: 1, incomplete: 2 });
  expect(result.holdings).toEqual([
    { instrument_id: 1, ticker: 'DYCA', quantity: 3, last_price: 125, avg_cost_price: 100 },
    { instrument_id: 7, ticker: null, quantity: 3, last_price: 125, avg_cost_price: 100 },
    { instrument_id: 8, ticker: 'DYCA', quantity: 3, last_price: 125, avg_cost_price: null },
  ]);
});

it('distingue un portfolio vacío de una respuesta inválida', () => {
  expect(parsePortfolio({ cash: 1000, holdings: [] })).toEqual({ holdings: [], omitted: 0, incomplete: 0 });
  expect(() => parsePortfolio({ cash: 1000, holdings: 'nada' })).toThrow();
  expect(() => parsePortfolio({ cash: 1000, holdings: [{ ticker: 'DYCA' }] })).toThrow();
});
