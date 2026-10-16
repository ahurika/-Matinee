import { Hono } from 'hono';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { showtimeRepository } from '../repositories/showtimeRepository.js';
import { ticketService } from '../services/ticketService.js';

export const ticketsRoute = new Hono();

ticketsRoute.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  const { rows: bookings } = await pool.query<{
    id: string;
    showtime_id: string;
    seat_id: string;
    order_id: string;
    status: string;
    used_at: Date | null;
    created_at: Date;
    row_label: string;
    number: number;
    kind: string;
    screen_name: string;
    cinema_name: string;
    city: string;
    starts_at: Date;
    movie_tmdb_id: number;
  }>(
    `SELECT
       b.id, b.showtime_id, b.seat_id, b.order_id, b.status, b.used_at, b.created_at,
       s.row_label, s.number, s.kind,
       sc.name AS screen_name,
       cn.name AS cinema_name, cn.city,
       st.starts_at, st.movie_tmdb_id
     FROM bookings b
     JOIN seats s ON s.id = b.seat_id
     JOIN showtimes st ON st.id = b.showtime_id
     JOIN screens sc ON sc.id = st.screen_id
     JOIN cinemas cn ON cn.id = sc.cinema_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [user.id],
  );

  const items = bookings.map((b) => ({
    ...b,
    token: ticketService.generateTicketToken(b.id, b.showtime_id, b.seat_id),
  }));

  return c.json({ tickets: items }, 200);
});

ticketsRoute.get('/:bookingId', requireAuth, async (c) => {
  const user = c.get('user');
  const bookingId = c.req.param('bookingId');

  const { rows } = await pool.query<{
    id: string;
    showtime_id: string;
    seat_id: string;
    status: string;
    used_at: Date | null;
    row_label: string;
    number: number;
    kind: string;
  }>(
    `SELECT b.id, b.showtime_id, b.seat_id, b.status, b.used_at,
            s.row_label, s.number, s.kind
     FROM bookings b
     JOIN seats s ON s.id = b.seat_id
     WHERE b.id = $1 AND b.user_id = $2`,
    [bookingId, user.id],
  );

  if (rows.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Ticket not found', 404);
  }

  const b = rows[0];
  const showtime = await showtimeRepository.getShowtime(b.showtime_id);
  const token = ticketService.generateTicketToken(b.id, b.showtime_id, b.seat_id);

  return c.json({
    ticket: {
      ...b,
      showtime,
      token,
    },
  }, 200);
});
