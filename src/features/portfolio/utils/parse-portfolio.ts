import { z } from 'zod';

import { parseRows } from '@/lib/parse-rows';

import { holdingSchema, type Portfolio } from '../types/holding';

const responseSchema = z.object({
  cash: z.number().nonnegative().nullable().catch(null),
  holdings: z.array(z.unknown()),
});

export function parsePortfolio(input: unknown): Portfolio {
  const { cash, holdings } = responseSchema.parse(input);
  const { items, omitted, incomplete } = parseRows(
    holdingSchema,
    holdings,
    (row) => row.ticker === null || row.quantity === null || row.last_price === null || row.avg_cost_price === null,
  );
  return { cash, holdings: items, omitted, incomplete };
}
