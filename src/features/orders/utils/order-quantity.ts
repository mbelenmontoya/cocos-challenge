export type MaxSharesResult =
  | { status: 'ok'; shares: number }
  | { status: 'insufficient' }
  | { status: 'invalid_amount' }
  | { status: 'price_unavailable' };

// Reads the digits instead of multiplying, because 1.15 * 100 is 114.99999999999999 in floating point.
function toCents(text: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1] + (match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Calculates the most whole shares an amount in pesos can buy at the last price. */
export function maxSharesForAmount(amountText: string, lastPrice: number | null): MaxSharesResult {
  const amount = toCents(amountText.trim());
  if (!amount) return { status: 'invalid_amount' };

  const price = lastPrice === null ? null : toCents(String(lastPrice));
  if (!price) return { status: 'price_unavailable' };

  const shares = Math.floor(amount / price);
  return shares > 0 ? { status: 'ok', shares } : { status: 'insufficient' };
}

/** Parses a LIMIT price in pesos with up to two decimals, or returns null when it is not above zero. */
export function parseLimitPrice(text: string): number | null {
  const cents = toCents(text.trim());
  return cents ? cents / 100 : null;
}

/** Parses an exact share count, or returns null when it is not a positive whole number. */
export function parseExactShares(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const shares = Number(trimmed);
  return Number.isSafeInteger(shares) && shares > 0 ? shares : null;
}
