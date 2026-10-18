import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type MovieListItem = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
};

export type MovieDetail = MovieListItem & {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline?: string;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
};

export const movieKeys = {
  all: ['movies'] as const,
  nowPlaying: () => [...movieKeys.all, 'now-playing'] as const,
  upcoming: () => [...movieKeys.all, 'upcoming'] as const,
  detail: (id: number | string) => [...movieKeys.all, 'detail', id] as const,
  search: (query: string) => [...movieKeys.all, 'search', query] as const,
};

export function useNowPlayingMovies() {
  return useQuery({
    queryKey: movieKeys.nowPlaying(),
    queryFn: async () => {
      const res = await apiClient<{ items?: any[]; movies?: any[]; stale?: boolean }>('/v1/movies/now-playing');
      const list = res.items || res.movies || [];
      const movies: MovieListItem[] = list.map((m: any) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? m.posterUrl ?? null,
        backdrop_path: m.backdrop_path ?? m.backdropUrl ?? null,
        overview: m.overview ?? '',
        release_date: m.release_date ?? m.releaseDate ?? '',
        vote_average: m.vote_average ?? m.rating ?? 0,
        vote_count: m.vote_count ?? 0,
        genre_ids: m.genre_ids ?? m.genreIds ?? [],
      }));
      return { movies, stale: res.stale };
    },
    staleTime: 60_000,
  });
}

export function useUpcomingMovies() {
  return useQuery({
    queryKey: movieKeys.upcoming(),
    queryFn: async () => {
      const res = await apiClient<{ items?: any[]; movies?: any[]; stale?: boolean }>('/v1/movies/upcoming');
      const list = res.items || res.movies || [];
      const movies: MovieListItem[] = list.map((m: any) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? m.posterUrl ?? null,
        backdrop_path: m.backdrop_path ?? m.backdropUrl ?? null,
        overview: m.overview ?? '',
        release_date: m.release_date ?? m.releaseDate ?? '',
        vote_average: m.vote_average ?? m.rating ?? 0,
        vote_count: m.vote_count ?? 0,
        genre_ids: m.genre_ids ?? m.genreIds ?? [],
      }));
      return { movies, stale: res.stale };
    },
    staleTime: 60_000,
  });
}

export function useMovieDetail(tmdbId: number | string) {
  return useQuery({
    queryKey: movieKeys.detail(tmdbId),
    queryFn: async () => {
      const res = await apiClient<{ item?: any; movie?: any; stale?: boolean }>(`/v1/movies/${tmdbId}`);
      const m = res.item || res.movie;
      if (!m) throw new Error('Movie not found');
      const movie: MovieDetail = {
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? m.posterUrl ?? null,
        backdrop_path: m.backdrop_path ?? m.backdropUrl ?? null,
        overview: m.overview ?? '',
        release_date: m.release_date ?? m.releaseDate ?? '',
        vote_average: m.vote_average ?? m.rating ?? 0,
        vote_count: m.vote_count ?? 0,
        genre_ids: m.genre_ids ?? m.genreIds ?? [],
        genres: Array.isArray(m.genres)
          ? m.genres.map((g: any, idx: number) => (typeof g === 'string' ? { id: idx, name: g } : g))
          : [],
        runtime: m.runtime ?? m.runtimeMinutes ?? 0,
        tagline: m.tagline,
        credits: m.credits ?? (m.cast ? { cast: m.cast.map((c: any) => ({ id: c.id, name: c.name, character: c.character, profile_path: c.profile_path ?? c.profileUrl ?? null })) } : undefined),
      };
      return { movie, stale: res.stale };
    },
    staleTime: 60_000,
    enabled: Boolean(tmdbId),
  });
}

export function useSearchMovies(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: movieKeys.search(trimmed),
    queryFn: async () => {
      const res = await apiClient<{ items?: any[]; results?: any[] }>(`/v1/movies/search?q=${encodeURIComponent(trimmed)}`);
      const list = res.items || res.results || [];
      const results: MovieListItem[] = list.map((m: any) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? m.posterUrl ?? null,
        backdrop_path: m.backdrop_path ?? m.backdropUrl ?? null,
        overview: m.overview ?? '',
        release_date: m.release_date ?? m.releaseDate ?? '',
        vote_average: m.vote_average ?? m.rating ?? 0,
        vote_count: m.vote_count ?? 0,
        genre_ids: m.genre_ids ?? m.genreIds ?? [],
      }));
      return { results };
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}
