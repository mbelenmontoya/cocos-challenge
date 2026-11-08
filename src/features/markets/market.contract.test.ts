/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */

import { api } from '@/api/client';

import { getMarket } from './api';
import { calculateReturn } from './instruments';

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
    expect(instrument.type).toBe('ACCIONES');
    expect(instrument.ticker.length).toBeGreaterThan(0);
    expect(Number.isFinite(calculateReturn(instrument))).toBe(true);
  }
}, 15_000);
