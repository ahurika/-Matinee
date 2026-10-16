// THE ONLY FILE THAT KNOWS TMDB'S DATA SHAPE.
// Everything else in the backend and the app uses the Movie and MovieDetail types exported here.
// If TMDB renames a field, only this file changes.
import { z } from 'zod';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p/'; // confirm against TMDB's current /configuration response
const POSTER_SIZE = 'w342';
const BACKDROP_SIZE = 'w780';
const PROFILE_SIZE = 'w185';

// ---- Our own types (what the rest of the system sees) ----
export type Movie = {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  rating: number | null; // 0 to 10, one decimal
  genreIds: number[];
};
export type CastMember = { id: number; name: string; character: string; photoUrl: string | null };
export type MovieDetail = Movie & { runtimeMinutes: number | null; genres: string[]; cast: CastMember[] };

// ---- TMDB shapes (tolerant: unknown fields pass, missing optional fields get defaults) ----
const rawMovie = z
  .object({
    id: z.number(),
    title: z.string().optional(),
    name: z.string().optional(),
    original_title: z.string().optional(),
    overview: z.string().optional(),
    poster_path: z.string().nullable().optional(),
    backdrop_path: z.string().nullable().optional(),
    release_date: z.string().optional(),
    vote_average: z.number().optional(),
    genre_ids: z.array(z.number()).optional(),
    runtime: z.number().nullable().optional(),
    genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
    credits: z
      .object({
        cast: z
          .array(z.object({ id: z.number(), name: z.string().optional(), character: z.string().optional(), profile_path: z.string().nullable().optional() }).passthrough())
          .optional(),
      })
      .optional(),
  })
  .passthrough();

const img = (path: string | null | undefined, size: string) => (path ? `${IMAGE_BASE}${size}${path}` : null);

export function mapMovie(input: unknown): Movie | null {
  const p = rawMovie.safeParse(input);
  if (!p.success) return null; // an item we cannot understand is dropped, it never crashes the list
  const m = p.data;
  return {
    id: m.id,
    title: m.title ?? m.name ?? m.original_title ?? 'Untitled',
    overview: m.overview ?? '',
    posterUrl: img(m.poster_path, POSTER_SIZE),
    backdropUrl: img(m.backdrop_path, BACKDROP_SIZE),
    releaseDate: m.release_date ? m.release_date : null,
    rating: typeof m.vote_average === 'number' ? Math.round(m.vote_average * 10) / 10 : null,
    genreIds: m.genre_ids ?? m.genres?.map((g) => g.id) ?? [],
  };
}

export function mapMovieList(input: unknown): Movie[] {
  const results = (input as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  return results.map(mapMovie).filter((m): m is Movie => m !== null);
}

export function mapMovieDetail(input: unknown): MovieDetail | null {
  const base = mapMovie(input);
  const p = rawMovie.safeParse(input);
  if (!base || !p.success) return null;
  return {
    ...base,
    runtimeMinutes: p.data.runtime ?? null,
    genres: p.data.genres?.map((g) => g.name) ?? [],
    cast: (p.data.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name ?? 'Unknown',
      character: c.character ?? '',
      photoUrl: img(c.profile_path, PROFILE_SIZE),
    })),
  };
}

// ---- Resilient HTTP: retry with backoff, honor Retry-After, circuit breaker ----
export class TmdbUnavailable extends Error {
  constructor(message = 'TMDB unavailable') { super(message); }
}

type Opts = {
  fetchFn: typeof fetch;
  token: string;
  baseUrl?: string;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  maxAttempts?: number;
  baseDelayMs?: number;
  breakerThreshold?: number;
  breakerOpenMs?: number;
};

export class TmdbClient {
  private failures = 0;
  private openUntil = 0;
  constructor(private o: Opts) {}

  private get now() { return (this.o.now ?? Date.now)(); }
  private sleep(ms: number) { return (this.o.sleep ?? ((x) => new Promise<void>((r) => setTimeout(r, x))))(ms); }

  async getJson(path: string): Promise<unknown> {
    const threshold = this.o.breakerThreshold ?? 5;
    if (this.now < this.openUntil) throw new TmdbUnavailable('circuit open');
    const attempts = this.o.maxAttempts ?? 3;
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await this.o.fetchFn(`${this.o.baseUrl ?? 'https://api.themoviedb.org/3'}${path}`, {
          headers: { Authorization: `Bearer ${this.o.token}`, accept: 'application/json' },
        });
        if (res.ok) { this.failures = 0; return await res.json(); }
        if (res.status !== 429 && res.status < 500) { // 4xx other than 429: our bug or a missing item, do not retry
          throw new TmdbUnavailable(`TMDB ${res.status}`);
        }
        const retryAfter = Number(res.headers.get('retry-after'));
        lastErr = new TmdbUnavailable(`TMDB ${res.status}`);
        if (i < attempts - 1) await this.sleep(retryAfter > 0 ? retryAfter * 1000 : this.delay(i));
      } catch (e) {
        lastErr = e;
        if (e instanceof TmdbUnavailable && /TMDB 4\d\d/.test(e.message) && !/429/.test(e.message)) break;
        if (i < attempts - 1) await this.sleep(this.delay(i));
      }
    }
    this.failures++;
    if (this.failures >= threshold) this.openUntil = this.now + (this.o.breakerOpenMs ?? 30_000);
    throw lastErr instanceof TmdbUnavailable ? lastErr : new TmdbUnavailable(String(lastErr));
  }

  private delay(attempt: number) {
    const base = (this.o.baseDelayMs ?? 300) * 3 ** attempt; // 300, 900, 2700 ...
    return base + Math.floor(Math.random() * (base / 3)); // jitter
  }

  async nowPlaying() { return mapMovieList(await this.getJson('/movie/now_playing?language=en-US&page=1')); }
  async upcoming() { return mapMovieList(await this.getJson('/movie/upcoming?language=en-US&page=1')); }
  async detail(id: number) {
    const m = mapMovieDetail(await this.getJson(`/movie/${id}?append_to_response=credits&language=en-US`));
    if (!m) throw new TmdbUnavailable('unreadable movie');
    return m;
  }
  async search(q: string) { return mapMovieList(await this.getJson(`/search/movie?query=${encodeURIComponent(q)}&include_adult=false&page=1`)); }
}
