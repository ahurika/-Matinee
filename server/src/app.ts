import crypto from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env.js';
import { pool } from './lib/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authRoute } from './routes/auth.js';
import { healthRoute } from './routes/health.js';
import { moviesRoute } from './routes/movies.js';
import { operatorRoute } from './routes/operator.js';
import { ordersRoute } from './routes/orders.js';
import { showtimesRoute } from './routes/showtimes.js';
import { ticketsRoute } from './routes/tickets.js';
import { webhooksRoute } from './routes/webhooks.js';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', requestIdMiddleware);
  app.use('*', logger());
  app.use('*', cors());

  // Error handling
  app.onError(errorHandler);

  // Health endpoint (root path /health per PRD 13)
  app.route('/health', healthRoute);

  // Auth endpoints (reused from Rota)
  app.route('/v1/auth', authRoute);
  app.route('/auth', authRoute);

  // Movie BFF endpoints
  app.route('/v1/movies', moviesRoute);
  app.route('/movies', moviesRoute);

  // Showtime, seatmap, availability, and hold endpoints
  app.route('/v1/showtimes', showtimesRoute);
  app.route('/showtimes', showtimesRoute);

  // Orders endpoints
  app.route('/v1/orders', ordersRoute);
  app.route('/orders', ordersRoute);

  // Webhook endpoints
  app.route('/v1/webhooks', webhooksRoute);
  app.route('/webhooks', webhooksRoute);

  // Operator endpoints (protected by operator API key)
  app.route('/v1/operator', operatorRoute);
  app.route('/operator', operatorRoute);

  // Tickets endpoints
  app.route('/v1/tickets', ticketsRoute);
  app.route('/tickets', ticketsRoute);

  // Loadtest harness endpoint (only active when LOADTEST_MODE is true in non-production)
  if (env.LOADTEST_MODE && env.NODE_ENV !== 'production') {
    app.post('/v1/test/book', async (c) => {
      const userId = c.req.header('x-user-id') ?? 'anon';
      const { showtimeId, seatIds } = await c.req.json<{ showtimeId: string; seatIds: string[] }>();
      try {
        await pool.query(
          `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'dummyhash') ON CONFLICT (id) DO NOTHING`,
          [userId, `${userId}@loadtest.local`],
        );
        const orderId = `ord_${crypto.randomUUID()}`;
        await pool.query(
          `INSERT INTO orders (id, user_id, showtime_id, subtotal_kobo, fee_kobo, total_kobo, hold_id, hold_expires_at, idempotency_key, status)
           VALUES ($1, $2, $3, 450000, 45000, 495000, $4, now() + interval '10 minutes', $5, 'confirmed')`,
          [orderId, userId, showtimeId, `hld_${userId}`, `idem_${crypto.randomUUID()}`],
        );
        for (const s of seatIds) {
          await pool.query(
            `INSERT INTO bookings (id, showtime_id, seat_id, order_id, user_id, ticket_code)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [`bkg_${crypto.randomUUID()}`, showtimeId, s, orderId, userId, `TKT_${s}`],
          );
        }
        return c.json({ ok: true });
      } catch (e: any) {
        console.error('TestBook error:', e);
        return c.json({ error: { code: e?.code === '23505' ? 'SEAT_TAKEN' : 'INTERNAL', message: e?.message } }, 409);
      }
    });
  }

  return app;
}

export const app = createApp();
