import { z } from 'zod';

import { parseRows } from '@/lib/parse-rows';

import { holdingSchema, type Portfolio } from '../types/holding';

const responseSchema = z.object({ holdings: z.array(z.unknown()) });

export function parsePortfolio(input: unknown): Portfolio {
  const { items, omitted, incomplete } = parseRows(
    holdingSchema,
    responseSchema.parse(input).holdings,
    (row) => row.ticker === null || row.quantity === null || row.last_price === null || row.avg_cost_price === null,
  );
  return { holdings: items, omitted, incomplete };
}
