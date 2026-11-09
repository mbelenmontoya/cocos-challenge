import { readValidated } from '@/lib/read';

import type { Market } from '../types/instrument';
import { parseInstruments } from '../utils/parse-instruments';

export function getMarket(signal: AbortSignal): Promise<Market> {
  return readValidated('/instruments', { signal }, parseInstruments);
}
