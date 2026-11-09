import type { AxiosRequestConfig } from 'axios';

import { api } from '@/api/client';
import { normalizeError } from '@/api/errors';

import { parseInstruments } from './instruments';

type Market = ReturnType<typeof parseInstruments>;

async function readInstruments(path: string, config: AxiosRequestConfig): Promise<Market> {
  try {
    const response = await api.get<unknown>(path, config);
    return parseInstruments(response.data);
  } catch (error) {
    throw normalizeError(error);
  }
}

export function getMarket(signal: AbortSignal): Promise<Market> {
  return readInstruments('/instruments', { signal });
}

export function searchInstruments(query: string, signal: AbortSignal): Promise<Market> {
  return readInstruments('/search', { params: { query }, signal });
}
