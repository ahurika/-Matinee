import { Hono } from 'hono';
import { z } from 'zod';
import { movieService } from '../services/movieService.js';

export const moviesRoute = new Hono();

const idParamSchema = z.object({
  tmdbId: z.string().regex(/^\d+$/, 'tmdbId must be an integer').transform((v) => parseInt(v, 10)),
});

moviesRoute.get('/now-playing', async (c) => {
  const result = await movieService.getNowPlaying();
  return c.json(result, 200);
});

moviesRoute.get('/upcoming', async (c) => {
  const result = await movieService.getUpcoming();
  return c.json(result, 200);
});

moviesRoute.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const result = await movieService.search(q);
  return c.json(result, 200);
});

moviesRoute.get('/:tmdbId', async (c) => {
  const { tmdbId } = idParamSchema.parse(c.req.param());
  const result = await movieService.getMovieDetail(tmdbId);
  return c.json(result, 200);
});
