import { z } from 'zod';

const instrumentSchema = z.object({
  id: z.number().int().positive(),
  ticker: z.string().trim().min(1),
  name: z.string().trim().min(1).nullable().catch(null),
  type: z.enum(['ACCIONES', 'MONEDA']),
  last_price: z.number().positive().nullable().catch(null),
  close_price: z.number().positive().nullable().catch(null),
});

export type Instrument = z.infer<typeof instrumentSchema>;

export function parseInstruments(input: unknown) {
  const records = z.array(z.unknown()).parse(input);
  const instruments: Instrument[] = [];
  let omitted = 0;
  let incomplete = 0;

  for (const record of records) {
    const parsed = instrumentSchema.safeParse(record);
    if (!parsed.success) {
      omitted++;
      continue;
    }
    const instrument = parsed.data;
    if (instrument.type === 'MONEDA') continue;
    instruments.push(instrument);
    if (instrument.name === null || instrument.last_price === null || instrument.close_price === null) incomplete++;
  }

  if (records.length > 0 && omitted === records.length) {
    throw new z.ZodError([{ code: 'custom', path: [], message: 'Ningún instrumento tiene una identidad válida.' }]);
  }
  return { instruments, omitted, incomplete };
}

export function calculateReturn(instrument: Instrument): number | null {
  if (instrument.last_price === null || instrument.close_price === null) return null;
  const value = ((instrument.last_price - instrument.close_price) / instrument.close_price) * 100;
  return Number.isFinite(value) ? value : null;
}
