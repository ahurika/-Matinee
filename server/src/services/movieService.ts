import { env } from '../config/env.js';
import { getCached } from '../integrations/tmdb/cache.js';
import {
  type Movie,
  type MovieDetail,
  TmdbClient,
  TmdbUnavailable,
} from '../integrations/tmdb/tmdbClient.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { movieRepository } from '../repositories/movieRepository.js';

export class MovieService {
  private client: TmdbClient;

  constructor(client?: TmdbClient) {
    this.client =
      client ??
      new TmdbClient({
        fetchFn: fetch,
        token: env.TMDB_READ_ACCESS_TOKEN || 'test_token',
      });
  }

  async getNowPlaying(): Promise<{ items: Movie[]; stale: boolean }> {
    try {
      const res = await getCached<Movie[]>(redis, 'movies:now', {
        ttlSec: 6 * 3600, // 6 hours
        staleSec: 7 * 24 * 3600, // 7 days
        loader: async () => {
          const list = await this.client.nowPlaying();
          // Snapshot all returned movies for offline fallback
          for (const m of list) {
            movieRepository.saveSnapshot(m.id, m).catch(() => {});
          }
          return list;
        },
      });
      return { items: res.data, stale: res.stale };
    } catch (err) {
      if (err instanceof TmdbUnavailable) {
        throw new AppError('UPSTREAM_TIMEOUT', 'Movie service temporarily unavailable', 503);
      }
      throw err;
    }
  }

  async getUpcoming(): Promise<{ items: Movie[]; stale: boolean }> {
    try {
      const res = await getCached<Movie[]>(redis, 'movies:upcoming', {
        ttlSec: 12 * 3600, // 12 hours
        staleSec: 7 * 24 * 3600, // 7 days
        loader: async () => {
          const list = await this.client.upcoming();
          for (const m of list) {
            movieRepository.saveSnapshot(m.id, m).catch(() => {});
          }
          return list;
        },
      });
      return { items: res.data, stale: res.stale };
    } catch (err) {
      if (err instanceof TmdbUnavailable) {
        throw new AppError('UPSTREAM_TIMEOUT', 'Movie service temporarily unavailable', 503);
      }
      throw err;
    }
  }

  async getMovieDetail(id: number): Promise<{ item: MovieDetail; stale: boolean }> {
    try {
      const res = await getCached<MovieDetail>(redis, `movie:${id}`, {
        ttlSec: 24 * 3600, // 24 hours
        staleSec: 7 * 24 * 3600, // 7 days
        loader: async () => {
          const d = await this.client.detail(id);
          movieRepository.saveSnapshot(id, d).catch(() => {});
          return d;
        },
      });
      return { item: res.data, stale: res.stale };
    } catch (err) {
      // Last-resort fallback: database snapshot
      const snapshot = await movieRepository.getSnapshot<MovieDetail>(id);
      if (snapshot) {
        return { item: snapshot, stale: true };
      }

      if (err instanceof TmdbUnavailable && /TMDB 404/.test(err.message)) {
        throw new AppError('MOVIE_NOT_FOUND', 'Movie not found', 404);
      }
      throw new AppError('MOVIE_NOT_FOUND', 'Movie details unavailable', 404);
    }
  }

  async search(query: string): Promise<{ items: Movie[] }> {
    const q = query.trim();
    if (q.length < 2 || q.length > 80) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Search query must be between 2 and 80 characters',
        400,
        { q: ['Query must be between 2 and 80 characters'] },
      );
    }

    try {
      const normalized = q.toLowerCase();
      const res = await getCached<Movie[]>(redis, `search:${normalized}`, {
        ttlSec: 10 * 60, // 10 minutes
        staleSec: 10 * 60,
        loader: async () => {
          return this.client.search(q);
        },
      });
      return { items: res.data };
    } catch (err) {
      if (err instanceof TmdbUnavailable) {
        throw new AppError('UPSTREAM_TIMEOUT', 'Search temporarily unavailable', 503);
      }
      throw err;
    }
  }
}

export const movieService = new MovieService();
