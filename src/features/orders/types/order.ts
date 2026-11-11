import { z } from 'zod';

export type OrderBody = {
  instrument_id: number;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
};

export const orderSchema = z.object({
  id: z.number().int().positive(),
  instrument_id: z.number(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number(),
  price: z.number().nullable(),
  status: z.enum(['PENDING', 'REJECTED', 'FILLED']),
});

export type Order = z.infer<typeof orderSchema>;

export type OrderInstrument = { id: number; ticker: string; last_price: number | null };

/** What the account has for this instrument. A null value means it could not be read. */
export type OrderAccount = { cash: number | null; heldShares: number | null };
