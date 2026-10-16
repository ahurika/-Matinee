// All money is integer kobo (NGN). Prices and the fee rule live here and nowhere else.
export const PRICES_KOBO = { standard: 450_000, premium: 650_000, wheelchair: 450_000 } as const;
export type SeatKind = keyof typeof PRICES_KOBO;

export const FEE_PERCENT = 5;
export const FEE_MIN_KOBO = 5_000;
export const MAX_SEATS_PER_ORDER = 8;

export function serviceFeeKobo(subtotalKobo: number): number {
  if (!Number.isInteger(subtotalKobo) || subtotalKobo < 0) throw new Error('INVALID_SUBTOTAL');
  return Math.max(FEE_MIN_KOBO, Math.floor((subtotalKobo * FEE_PERCENT) / 100));
}

// The server calls this with seat kinds it read from the database. The client never sends prices.
export function priceOrder(kinds: SeatKind[], prices: Record<SeatKind, number> = PRICES_KOBO) {
  if (kinds.length === 0 || kinds.length > MAX_SEATS_PER_ORDER) throw new Error('INVALID_SEAT_COUNT');
  const subtotalKobo = kinds.reduce((sum, k) => sum + prices[k], 0);
  const feeKobo = serviceFeeKobo(subtotalKobo);
  return { subtotalKobo, feeKobo, totalKobo: subtotalKobo + feeKobo, currency: 'NGN' as const };
}

export function formatNaira(kobo: number): string {
  const naira = Math.trunc(kobo / 100);
  const rest = String(kobo % 100).padStart(2, '0');
  return `N${naira.toLocaleString('en-NG')}${rest === '00' ? '' : '.' + rest}`;
}
