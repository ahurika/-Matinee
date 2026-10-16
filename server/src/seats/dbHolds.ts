import type { Pool } from 'pg';

// Fallback when Redis is unavailable. Slower, but still correct.
// A seat can be taken only if there is no row, or the old row has expired, or it is already ours.
export async function holdSeatsInDb(
  pool: Pool,
  p: { showtimeId: string; seatIds: string[]; holdId: string; ttlMs: number },
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ seat_id: string }>(
      `INSERT INTO seat_holds (showtime_id, seat_id, hold_id, expires_at)
       SELECT $1, s, $3, now() + ($4 || ' milliseconds')::interval FROM unnest($2::text[]) AS s
       ON CONFLICT (showtime_id, seat_id) DO UPDATE
         SET hold_id = EXCLUDED.hold_id, expires_at = EXCLUDED.expires_at
         WHERE seat_holds.expires_at < now() OR seat_holds.hold_id = EXCLUDED.hold_id
       RETURNING seat_id`,
      [p.showtimeId, p.seatIds, p.holdId, String(p.ttlMs)],
    );
    // Seats already sold must never be held.
    const sold = await client.query(
      `SELECT 1 FROM bookings WHERE showtime_id = $1 AND seat_id = ANY($2::text[]) LIMIT 1`,
      [p.showtimeId, p.seatIds],
    );
    if (rows.length !== p.seatIds.length || sold.rowCount) {
      await client.query('ROLLBACK'); // all or nothing
      return false;
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
