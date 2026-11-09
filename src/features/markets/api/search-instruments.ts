import { readValidated } from '@/lib/read';

import type { Market } from '../types/instrument';
import { parseInstruments } from '../utils/parse-instruments';

export function searchInstruments(query: string, signal: AbortSignal): Promise<Market> {
  return readValidated('/search', { params: { query }, signal }, parseInstruments);
}
