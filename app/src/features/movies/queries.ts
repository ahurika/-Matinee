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
    queryFn: () => apiClient<{ movies: MovieListItem[]; stale?: boolean }>('/v1/movies/now-playing'),
    staleTime: 60_000,
  });
}

export function useUpcomingMovies() {
  return useQuery({
    queryKey: movieKeys.upcoming(),
    queryFn: () => apiClient<{ movies: MovieListItem[]; stale?: boolean }>('/v1/movies/upcoming'),
    staleTime: 60_000,
  });
}

export function useMovieDetail(tmdbId: number | string) {
  return useQuery({
    queryKey: movieKeys.detail(tmdbId),
    queryFn: () => apiClient<{ movie: MovieDetail; stale?: boolean }>(`/v1/movies/${tmdbId}`),
    staleTime: 60_000,
    enabled: Boolean(tmdbId),
  });
}

export function useSearchMovies(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: movieKeys.search(trimmed),
    queryFn: () => apiClient<{ results: MovieListItem[] }>(`/v1/movies/search?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}
