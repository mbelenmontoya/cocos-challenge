import type { Holding } from '../types/holding';

const finiteOrNull = (value: number) => (Number.isFinite(value) ? value : null);

export function marketValue({ quantity, last_price }: Holding): number | null {
  return quantity === null || last_price === null ? null : finiteOrNull(quantity * last_price);
}

export function gain({ quantity, last_price, avg_cost_price }: Holding): number | null {
  if (quantity === null || last_price === null || avg_cost_price === null) return null;
  return finiteOrNull((last_price - avg_cost_price) * quantity);
}

export function returnPercent({ last_price, avg_cost_price }: Holding): number | null {
  if (last_price === null || avg_cost_price === null) return null;
  return finiteOrNull(((last_price - avg_cost_price) / avg_cost_price) * 100);
}
