import pg from 'pg';
import { env } from '../src/config/env.js';

async function check() {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/matinee' });
  const showtimeId = process.env.SHOWTIME_ID || 'st-dune-sb1-today-1800';

  const duplicates = await pool.query(
    `SELECT count(*) FROM (
      SELECT showtime_id, seat_id FROM bookings GROUP BY 1, 2 HAVING count(*) > 1
    ) x`
  );

  const counts = await pool.query(
    `SELECT count(*) AS bookings, count(DISTINCT seat_id) AS distinct_seats
     FROM bookings WHERE showtime_id = $1`,
    [showtimeId]
  );

  console.log('--- Matinee Load Test Proof ---');
  console.log('Duplicates (must be 0):', duplicates.rows[0].count);
  console.log('Bookings:', counts.rows[0].bookings);
  console.log('Distinct Seats:', counts.rows[0].distinct_seats);

  await pool.end();
}

check().catch(console.error);
