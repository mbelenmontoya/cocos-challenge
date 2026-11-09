import type { Instrument } from '../types/instrument';

export function calculateReturn(instrument: Instrument): number | null {
  if (instrument.last_price === null || instrument.close_price === null) return null;
  const value = ((instrument.last_price - instrument.close_price) / instrument.close_price) * 100;
  return Number.isFinite(value) ? value : null;
}
