/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import { api } from '@/lib/client';

import { getMarket } from '../api/get-market';
import { calculateReturn } from '../utils/calculate-return';

const originalBaseURL = api.defaults.baseURL;

beforeAll(() => {
  api.defaults.baseURL = 'https://dummy-api-topaz.vercel.app';
});

afterAll(() => {
  api.defaults.baseURL = originalBaseURL;
});

it('integra la lectura de Cocos en modo off con el contrato y los cálculos reales de Mercado', async () => {
  const result = await getMarket(new AbortController().signal);

  expect(result).toMatchObject({ omitted: 0, incomplete: 0 });
  expect(new Set(result.instruments.map((item) => item.id)).size).toBe(result.instruments.length);
  for (const instrument of result.instruments) {
    expect(instrument.ticker.length).toBeGreaterThan(0);
    expect(Number.isFinite(calculateReturn(instrument))).toBe(true);
  }
}, 15_000);
