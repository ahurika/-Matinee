import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { pool } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import { movieRepository } from '../src/repositories/movieRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TMDB BFF Routes & Resilience (M2 / T15)', () => {
  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  it('GET /v1/movies/now-playing returns cached movies with stale flag', async () => {
    // Prime cache
    const mockMovies = [
      {
        id: 101,
        title: 'Mock Movie 1',
        overview: 'Overview 1',
        posterUrl: 'https://image.tmdb.org/t/p/w342/p1.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/w780/b1.jpg',
        releaseDate: '2026-10-15',
        rating: 8.5,
        genreIds: [28, 12],
      },
    ];
    await redis.set('fresh:movies:now', JSON.stringify(mockMovies), 'EX', 3600);

    const res = await app.request('/v1/movies/now-playing');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.stale).toBe(false);
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('Mock Movie 1');
  });

  it('GET /v1/movies/upcoming serves stale copy when fresh expires and TMDB is down', async () => {
    const mockMovies = [
      {
        id: 102,
        title: 'Upcoming SciFi',
        overview: 'Coming soon',
        posterUrl: null,
        backdropUrl: null,
        releaseDate: '2026-12-01',
        rating: null,
        genreIds: [878],
      },
    ];
    // Put only stale copy in Redis
    await redis.set('stale:movies:upcoming', JSON.stringify(mockMovies), 'EX', 86400);

    const res = await app.request('/v1/movies/upcoming');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.stale).toBe(true);
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('Upcoming SciFi');
  });

  it('GET /v1/movies/search validates query length', async () => {
    // Too short (1 char)
    const shortRes = await app.request('/v1/movies/search?q=a');
    expect(shortRes.status).toBe(400);
    const shortBody = (await shortRes.json()) as any;
    expect(shortBody.error.code).toBe('VALIDATION_ERROR');

    // Valid query with cached response
    await redis.set('fresh:search:dune', JSON.stringify([{ id: 693134, title: 'Dune: Part Two' }]), 'EX', 600);
    const validRes = await app.request('/v1/movies/search?q=Dune');
    expect(validRes.status).toBe(200);
    const validBody = (await validRes.json()) as any;
    expect(validBody.items[0].title).toBe('Dune: Part Two');
  });

  it('GET /v1/movies/:tmdbId falls back to PostgreSQL snapshot when Redis is empty', async () => {
    const mockDetail = {
      id: 999,
      title: 'Postgres Snapshot Film',
      overview: 'Retrieved from database snapshot',
      posterUrl: null,
      backdropUrl: null,
      releaseDate: '2026-05-01',
      rating: 9.0,
      genreIds: [18],
      runtimeMinutes: 140,
      genres: ['Drama'],
      cast: [],
    };
    await movieRepository.saveSnapshot(999, mockDetail);

    const res = await app.request('/v1/movies/999');
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.stale).toBe(true);
    expect(body.item.title).toBe('Postgres Snapshot Film');
    expect(body.item.runtimeMinutes).toBe(140);
  });

  it('enforces the One-File Rule: no TMDB raw fields outside server/src/integrations/tmdb', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const rawTmdbFields = ['poster_path', 'backdrop_path', 'vote_average', 'original_title'];

    function checkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip tmdb integration directory
          if (fullPath.includes(path.join('integrations', 'tmdb'))) continue;
          checkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const field of rawTmdbFields) {
            expect(content.includes(field), `File ${fullPath} references TMDB field '${field}' violating the one-file rule`).toBe(false);
          }
        }
      }
    }

    checkDir(srcDir);
  });
});
