import pg from 'pg';
import { env } from '../src/config/env.js';
import { redis } from '../src/lib/redis.js';

async function reset() {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/matinee' });
  const showtimeId = process.env.SHOWTIME_ID || 'st-dune-sb1-today-1800';

  await pool.query('DELETE FROM bookings WHERE showtime_id = $1', [showtimeId]);
  
  const keys = await redis.keys(`*${showtimeId}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  console.log(`Reset complete for showtime ${showtimeId}. Deleted bookings and ${keys.length} redis keys.`);
  await pool.end();
  await redis.quit();
}

reset().catch(console.error);
