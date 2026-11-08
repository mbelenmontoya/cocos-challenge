import { api } from '@/api/client';
import { normalizeError } from '@/api/errors';

import { parseInstruments } from './instruments';

export async function getMarket(signal: AbortSignal) {
  try {
    const response = await api.get<unknown>('/instruments', { signal });
    return parseInstruments(response.data);
  } catch (error) {
    throw normalizeError(error);
  }
}
