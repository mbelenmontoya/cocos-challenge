import { z } from 'zod';

export const holdingSchema = z.object({
  instrument_id: z.number().int().positive(),
  ticker: z.string().trim().min(1).nullable().catch(null),
  quantity: z.number().positive().nullable().catch(null),
  last_price: z.number().positive().nullable().catch(null),
  avg_cost_price: z.number().positive().nullable().catch(null),
});

export type Holding = z.infer<typeof holdingSchema>;

export type Portfolio = { holdings: Holding[]; omitted: number; incomplete: number };
