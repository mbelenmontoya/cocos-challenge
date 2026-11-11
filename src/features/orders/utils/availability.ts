import type { OrderAccount, OrderBody } from '../types/order';
import { toCents } from './order-quantity';

export type Availability =
  | { status: 'ok' }
  | { status: 'insufficient_cash'; cost: number; cash: number }
  | { status: 'insufficient_shares'; held: number };

const ok: Availability = { status: 'ok' };
const centsOf = (value: number | null | undefined) => (value === null || value === undefined ? null : toCents(String(value)));

/**
 * Checks the order against the cash and shares the account has. When a value is
 * missing or unreadable it returns ok, and the server decides.
 */
export function checkAvailability(body: OrderBody, lastPrice: number | null, account: OrderAccount | undefined): Availability {
  if (!account) return ok;

  if (body.side === 'SELL') {
    const held = account.heldShares;
    return held !== null && body.quantity > held ? { status: 'insufficient_shares', held } : ok;
  }

  const priceCents = centsOf(body.type === 'LIMIT' ? body.price : lastPrice);
  const cashCents = centsOf(account.cash);
  if (!priceCents || cashCents === null) return ok;

  // A cost beyond the safe integer range is still larger than any cash, so the comparison holds.
  const costCents = body.quantity * priceCents;
  if (costCents <= cashCents) return ok;
  return { status: 'insufficient_cash', cost: costCents / 100, cash: cashCents / 100 };
}
