import { parseRows } from '@/lib/parse-rows';

import { instrumentSchema, type Market } from '../types/instrument';

export function parseInstruments(input: unknown): Market {
  const { items, omitted, incomplete } = parseRows(
    instrumentSchema,
    input,
    (row) => row.name === null || row.last_price === null || row.close_price === null,
  );
  return { instruments: items, omitted, incomplete };
}
