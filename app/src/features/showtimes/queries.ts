import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiClient } from '../../api/client';
import type { Seat } from '../../ui/seatmap/types';

export type ShowtimeDetail = {
  id: string;
  movieTmdbId: number;
  screenId: string;
  screenName: string;
  cinemaId: string;
  cinemaName: string;
  cinemaCity: string;
  cinemaAddress: string;
  startsAt: string;
  bookingOpensAt: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  priceStandardKobo: number;
  pricePremiumKobo: number;
  isOpen: boolean;
};

export type SeatAvailability = {
  showtimeId: string;
  totalSeats: number;
  availableCount: number;
  heldCount: number;
  soldCount: number;
  seats: Seat[];
  etag: string;
  serverTime: string;
};

export const showtimeKeys = {
  all: ['showtimes'] as const,
  detail: (id: string) => [...showtimeKeys.all, 'detail', id] as const,
  availability: (id: string) => [...showtimeKeys.all, 'availability', id] as const,
  waitingRoom: (id: string) => [...showtimeKeys.all, 'waiting-room', id] as const,
};

export function useShowtimeDetail(showtimeId: string) {
  return useQuery({
    queryKey: showtimeKeys.detail(showtimeId),
    queryFn: () => apiClient<{ showtime: ShowtimeDetail }>(`/v1/showtimes/${showtimeId}`),
    enabled: Boolean(showtimeId),
    staleTime: 30_000,
  });
}

export function useSeatAvailability(showtimeId: string, enabled = true) {
  const etagRef = useRef<string | null>(null);

  return useQuery({
    queryKey: showtimeKeys.availability(showtimeId),
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await apiClient<SeatAvailability>(`/v1/showtimes/${showtimeId}/availability`, {
        headers,
      });

      if (res && res.etag) {
        etagRef.current = res.etag;
      }
      return res;
    },
    enabled: Boolean(showtimeId) && enabled,
    refetchInterval: 3000, // 3-second polling rule
    refetchIntervalInBackground: false,
  });
}

export function useHoldSeats(showtimeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatIds: string[]) =>
      apiClient<{
        holdId: string;
        expiresAt: string;
        serverNow: string;
        seatIds: string[];
      }>(`/v1/showtimes/${showtimeId}/hold`, {
        method: 'PUT',
        body: JSON.stringify({ seatIds }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showtimeKeys.availability(showtimeId) });
    },
  });
}

export function useReleaseSeats(showtimeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient<{ released: boolean }>(`/v1/showtimes/${showtimeId}/hold`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showtimeKeys.availability(showtimeId) });
    },
  });
}

export type WaitingRoomStatus = {
  status: 'admitted' | 'queued';
  position?: number;
  token?: string;
  estimatedWaitSeconds?: number;
};

export function useJoinWaitingRoom(showtimeId: string) {
  return useMutation({
    mutationFn: () =>
      apiClient<WaitingRoomStatus>(`/v1/showtimes/${showtimeId}/waiting-room/join`, {
        method: 'POST',
      }),
  });
}
