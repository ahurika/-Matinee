import type { Pool } from 'pg';
import { pool } from '../lib/db.js';

export interface ShowtimeRow {
  id: string;
  movie_tmdb_id: number;
  screen_id: string;
  screen_name: string;
  cinema_id: string;
  cinema_name: string;
  city: string;
  starts_at: Date;
  booking_opens_at: Date;
  status: string;
  price_standard_kobo: string;
  price_premium_kobo: string;
}

export interface SeatRow {
  id: string;
  screen_id: string;
  row_label: string;
  number: number;
  col_index: number;
  kind: 'standard' | 'premium' | 'wheelchair';
}

export class ShowtimeRepository {
  constructor(private db: Pool = pool) {}

  async getShowtime(id: string): Promise<ShowtimeRow | null> {
    const { rows } = await this.db.query<ShowtimeRow>(
      `SELECT
         st.id,
         st.movie_tmdb_id,
         st.screen_id,
         sc.name AS screen_name,
         sc.cinema_id,
         cn.name AS cinema_name,
         cn.city,
         st.starts_at,
         st.booking_opens_at,
         st.status,
         st.price_standard_kobo,
         st.price_premium_kobo
       FROM showtimes st
       JOIN screens sc ON sc.id = st.screen_id
       JOIN cinemas cn ON cn.id = sc.cinema_id
       WHERE st.id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async getSeatsForScreen(screenId: string): Promise<SeatRow[]> {
    const { rows } = await this.db.query<SeatRow>(
      `SELECT id, screen_id, row_label, number, col_index, kind
       FROM seats
       WHERE screen_id = $1
       ORDER BY row_label ASC, number ASC`,
      [screenId],
    );
    return rows;
  }

  async getShowtimesForMovie(movieId: number): Promise<ShowtimeRow[]> {
    const { rows } = await this.db.query<ShowtimeRow>(
      `SELECT
         st.id,
         st.movie_tmdb_id,
         st.screen_id,
         sc.name AS screen_name,
         sc.cinema_id,
         cn.name AS cinema_name,
         cn.city,
         st.starts_at,
         st.booking_opens_at,
         st.status,
         st.price_standard_kobo,
         st.price_premium_kobo
       FROM showtimes st
       JOIN screens sc ON sc.id = st.screen_id
       JOIN cinemas cn ON cn.id = sc.cinema_id
       WHERE st.movie_tmdb_id = $1 AND st.starts_at >= now() - interval '2 hours'
       ORDER BY st.starts_at ASC`,
      [movieId],
    );
    return rows;
  }
}

export const showtimeRepository = new ShowtimeRepository();
