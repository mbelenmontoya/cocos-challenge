import { z } from 'zod';

/** Validates an array row by row, so one broken row does not lose the others. */
export function parseRows<S extends z.ZodType>(
  schema: S,
  input: unknown,
  isIncomplete: (row: z.infer<S>) => boolean,
): { items: z.infer<S>[]; omitted: number; incomplete: number } {
  const records = z.array(z.unknown()).parse(input);
  const items: z.infer<S>[] = [];
  let omitted = 0;
  let incomplete = 0;

  for (const record of records) {
    const parsed = schema.safeParse(record);
    if (!parsed.success) {
      omitted++;
      continue;
    }
    items.push(parsed.data);
    if (isIncomplete(parsed.data)) incomplete++;
  }

  if (records.length > 0 && omitted === records.length) {
    throw new z.ZodError([{ code: 'custom', path: [], message: 'Ningún registro es válido.' }]);
  }
  return { items, omitted, incomplete };
}
