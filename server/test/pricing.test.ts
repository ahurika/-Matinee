import { describe, expect, it } from 'vitest';
import { formatNaira, priceOrder, serviceFeeKobo } from '../src/config/pricing.js';

describe('pricing (T11)', () => {
  const cases: [string, Parameters<typeof priceOrder>[0], number, number, number][] = [
    ['1 standard', ['standard'], 450000, 22500, 472500],
    ['2 standard', ['standard', 'standard'], 900000, 45000, 945000],
    ['standard + premium', ['standard', 'premium'], 1100000, 55000, 1155000],
    ['wheelchair priced as standard', ['wheelchair'], 450000, 22500, 472500],
    ['8 premium (max)', Array(8).fill('premium'), 5200000, 260000, 5460000],
    ['3 standard', ['standard', 'standard', 'standard'], 1350000, 67500, 1417500],
  ];
  for (const [name, kinds, sub, fee, total] of cases) {
    it(name, () => expect(priceOrder(kinds)).toEqual({ subtotalKobo: sub, feeKobo: fee, totalKobo: total, currency: 'NGN' }));
  }
  it('minimum fee applies to small subtotals', () => {
    expect(serviceFeeKobo(50000)).toBe(5000);
    expect(serviceFeeKobo(100000)).toBe(5000);
    expect(serviceFeeKobo(100100)).toBe(5005); // 5 percent floored
  });
  it('rounds the fee down, never up', () => expect(serviceFeeKobo(100019)).toBe(5000));
  it('rejects 0 seats, 9 seats, and bad subtotals', () => {
    expect(() => priceOrder([])).toThrow('INVALID_SEAT_COUNT');
    expect(() => priceOrder(Array(9).fill('standard'))).toThrow('INVALID_SEAT_COUNT');
    expect(() => serviceFeeKobo(1.5)).toThrow('INVALID_SUBTOTAL');
    expect(() => serviceFeeKobo(-1)).toThrow('INVALID_SUBTOTAL');
  });
  it('formats naira from kobo', () => {
    expect(formatNaira(450000)).toBe('N4,500');
    expect(formatNaira(472550)).toBe('N4,725.50');
  });
});
