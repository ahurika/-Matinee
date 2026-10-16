// Minimal stand-in server for validating the k6 script. It uses the REAL tested hold code and bookings table.
// Run it against a test database (it expects a simple bookings table, see seats.race.test.ts). Replace it with your actual Hono app once the hold and order endpoints exist. Auth is a header here, on purpose.
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Redis } from 'ioredis';
import pg from 'pg';
import { holdSeats, registerScripts } from '../src/seats/redisHolds.js';

const redis = new Redis(process.env.REDIS_URL!);
registerScripts(redis);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL!, max: 20 });
const app = new Hono();

app.put('/v1/showtimes/:id/hold', async (c) => {
  const userId = c.req.header('x-user-id') ?? 'anon';
  const { seatIds } = await c.req.json<{ seatIds: string[] }>();
  const r = await holdSeats(redis, { showtimeId: c.req.param('id'), seatIds, holdId: userId, ttlMs: 600_000 });
  if (r.ok) return c.json({ holdId: userId, seatIds });
  return c.json({ error: { code: 'SEAT_TAKEN', unavailableSeatIds: [r.seatId] } }, 409);
});

// Stands in for "webhook processed": inserts the booking. The unique constraint is the final guard.
app.post('/v1/test/book', async (c) => {
  const userId = c.req.header('x-user-id') ?? 'anon';
  const { showtimeId, seatIds } = await c.req.json<{ showtimeId: string; seatIds: string[] }>();
  try {
    for (const s of seatIds) await pool.query('INSERT INTO bookings (showtime_id, seat_id, user_id) VALUES ($1,$2,$3)', [showtimeId, s, userId]);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: { code: (e as { code?: string }).code === '23505' ? 'SEAT_TAKEN' : 'INTERNAL' } }, 409);
  }
});
app.get('/health', (c) => c.json({ ok: true }));
serve({ fetch: app.fetch, port: 3100 });
console.log('harness on 3100');
