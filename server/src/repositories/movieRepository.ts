import type { Pool } from 'pg';
import { pool } from '../lib/db.js';
import type { Movie, MovieDetail } from '../integrations/tmdb/tmdbClient.js';

export class MovieRepository {
  constructor(private db: Pool = pool) {}

  async saveSnapshot(tmdbId: number, data: Movie | MovieDetail): Promise<void> {
    await this.db.query(
      `INSERT INTO movie_snapshots (tmdb_id, data, fetched_at)
       VALUES ($1, $2, now())
       ON CONFLICT (tmdb_id) DO UPDATE
       SET data = EXCLUDED.data, fetched_at = now()`,
      [tmdbId, JSON.stringify(data)],
    );
  }

  async getSnapshot<T = MovieDetail>(tmdbId: number): Promise<T | null> {
    const { rows } = await this.db.query<{ data: T }>(
      `SELECT data FROM movie_snapshots WHERE tmdb_id = $1`,
      [tmdbId],
    );
    return rows[0]?.data ?? null;
  }
}

export const movieRepository = new MovieRepository();
