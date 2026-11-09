import { z } from 'zod';

export const instrumentSchema = z.object({
  id: z.number().int().positive(),
  ticker: z.string().trim().min(1),
  name: z.string().trim().min(1).nullable().catch(null),
  type: z.enum(['ACCIONES', 'MONEDA']),
  last_price: z.number().positive().nullable().catch(null),
  close_price: z.number().positive().nullable().catch(null),
});

export type Instrument = z.infer<typeof instrumentSchema>;

export type Market = { instruments: Instrument[]; omitted: number; incomplete: number };
