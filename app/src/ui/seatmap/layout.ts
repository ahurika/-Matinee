import type { Seat, SeatKind } from './types';

// Builds a demo hall: 20 rows x 16 seats = 320 seats with a center aisle. Used for the seeded screens, the component
// gallery, and tests. Real halls come from the server (screens and seats tables).
export function buildHall(opts: { rows?: number; perRow?: number; aisleAfter?: number } = {}): Seat[] {
  const rows = opts.rows ?? 20;
  const perRow = opts.perRow ?? 16;
  const aisleAfter = opts.aisleAfter ?? perRow / 2;
  const seats: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    const letter = String.fromCharCode(65 + r);
    for (let n = 1; n <= perRow; n++) {
      let kind: SeatKind = 'standard';
      if (r >= rows - 3) kind = 'premium'; // back rows
      if (r === rows - 1 && (n === 1 || n === perRow)) kind = 'wheelchair';
      seats.push({
        id: `${letter}-${n}`,
        row: letter,
        number: n,
        col: n <= aisleAfter ? n - 1 : n, // one empty column for the aisle
        kind,
        status: 'available',
      });
    }
  }
  return seats;
}
