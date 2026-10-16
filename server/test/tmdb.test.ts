import { Redis } from 'ioredis';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCached } from '../src/integrations/tmdb/cache.js';
import { mapMovie, mapMovieDetail, mapMovieList, TmdbClient, TmdbUnavailable } from '../src/integrations/tmdb/tmdbClient.js';

const redis = new Redis(process.env.REDIS_URL!);
beforeEach(async () => { await redis.flushdb(); });
afterAll(async () => { await redis.quit(); });

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const noSleep = async () => {};

describe('TMDB mapping (T15)', () => {
  it('maps a normal item into our type and builds image urls', () => {
    const m = mapMovie({ id: 1, title: 'Dune', poster_path: '/p.jpg', backdrop_path: '/b.jpg', vote_average: 8.2345, genre_ids: [1, 2], release_date: '2026-10-01', overview: 'x' });
    expect(m).toEqual({ id: 1, title: 'Dune', overview: 'x', posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/b.jpg', releaseDate: '2026-10-01', rating: 8.2, genreIds: [1, 2] });
  });
  it('does not break when TMDB renames or removes fields', () => {
    const m = mapMovie({ id: 2, poster: '/renamed.jpg', original_title: 'Fallback' }); // poster_path renamed, title missing
    expect(m).toMatchObject({ id: 2, title: 'Fallback', posterUrl: null, overview: '', rating: null, genreIds: [] });
  });
  it('drops items it cannot understand instead of crashing the list', () => {
    const list = mapMovieList({ results: [{ id: 1, title: 'A' }, { title: 'no id' }, 'junk', null, { id: 3, title: 'C' }] });
    expect(list.map((m) => m.id)).toEqual([1, 3]);
    expect(mapMovieList({ something_else: [] })).toEqual([]);
  });
  it('maps detail with runtime, genres, and capped cast', () => {
    const d = mapMovieDetail({ id: 5, title: 'X', runtime: 120, genres: [{ id: 1, name: 'Drama' }], credits: { cast: Array.from({ length: 30 }, (_, i) => ({ id: i, name: `A${i}`, character: 'C', profile_path: null })) } });
    expect(d!.runtimeMinutes).toBe(120);
    expect(d!.genres).toEqual(['Drama']);
    expect(d!.cast.length).toBe(12);
  });
});

describe('TMDB resilient client (T15)', () => {
  it('retries a 500 then succeeds', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValueOnce(ok({ results: [{ id: 1, title: 'A' }] }));
    const c = new TmdbClient({ fetchFn: fetchFn as unknown as typeof fetch, token: 't', sleep: noSleep });
    expect((await c.nowPlaying()).length).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
  it('honors Retry-After on 429', async () => {
    const sleeps: number[] = [];
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '2' } })).mockResolvedValueOnce(ok({ results: [] }));
    const c = new TmdbClient({ fetchFn: fetchFn as unknown as typeof fetch, token: 't', sleep: async (ms) => { sleeps.push(ms); } });
    await c.upcoming();
    expect(sleeps).toEqual([2000]);
  });
  it('does not retry a 404', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const c = new TmdbClient({ fetchFn: fetchFn as unknown as typeof fetch, token: 't', sleep: noSleep });
    await expect(c.detail(1)).rejects.toBeInstanceOf(TmdbUnavailable);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it('opens the circuit after repeated failures and stops calling TMDB', async () => {
    let t = 1_000_000;
    const fetchFn = vi.fn().mockRejectedValue(new Error('network'));
    const c = new TmdbClient({ fetchFn: fetchFn as unknown as typeof fetch, token: 't', sleep: noSleep, now: () => t, maxAttempts: 1, breakerThreshold: 5, breakerOpenMs: 30_000 });
    for (let i = 0; i < 5; i++) await c.nowPlaying().catch(() => {});
    expect(fetchFn).toHaveBeenCalledTimes(5);
    await expect(c.nowPlaying()).rejects.toThrow('circuit open');
    expect(fetchFn).toHaveBeenCalledTimes(5); // no new call while open
    t += 31_000; // half open: one more try is allowed
    await c.nowPlaying().catch(() => {});
    expect(fetchFn).toHaveBeenCalledTimes(6);
  });
});

describe('TMDB cache with stale copy and single flight (T15)', () => {
  it('serves fresh data from cache on the second call', async () => {
    const loader = vi.fn().mockResolvedValue([1, 2]);
    await getCached(redis, 'now', { ttlSec: 60, staleSec: 600, loader });
    const r = await getCached(redis, 'now', { ttlSec: 60, staleSec: 600, loader });
    expect(r).toEqual({ data: [1, 2], stale: false });
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it('serves the stale copy when TMDB is down', async () => {
    await getCached(redis, 'now', { ttlSec: 60, staleSec: 600, loader: async () => ['saved'] });
    await redis.del('fresh:now'); // fresh copy expired
    const r = await getCached(redis, 'now', { ttlSec: 60, staleSec: 600, loader: async () => { throw new TmdbUnavailable(); } });
    expect(r).toEqual({ data: ['saved'], stale: true });
  });
  it('throws when there is nothing to serve', async () => {
    await expect(getCached(redis, 'never', { ttlSec: 60, staleSec: 600, loader: async () => { throw new TmdbUnavailable(); } })).rejects.toBeInstanceOf(TmdbUnavailable);
  });
  it('single flight: 50 concurrent cold requests call TMDB once', async () => {
    const loader = vi.fn().mockImplementation(async () => { await new Promise((r) => setTimeout(r, 150)); return ['x']; });
    const results = await Promise.all(Array.from({ length: 50 }, () => getCached<string[]>(redis, 'hot', { ttlSec: 60, staleSec: 600, loader })));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.data[0] === 'x')).toBe(true);
  });
});
