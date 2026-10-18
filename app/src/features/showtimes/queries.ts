import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiClient } from '../../api/client';
import { buildHall } from '../../ui/seatmap/layout';
import type { Seat } from '../../ui/seatmap/types';

const BASE_HALL = buildHall();

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
  const queryClient = useQueryClient();
  const etagRef = useRef<string | null>(null);

  return useQuery({
    queryKey: showtimeKeys.availability(showtimeId),
    queryFn: async (): Promise<SeatAvailability> => {
      const headers: Record<string, string> = {};
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await apiClient<any>(`/v1/showtimes/${showtimeId}/availability`, {
        headers,
      });

      // 304 Not Modified: return existing cached state
      if (res === null) {
        const cached = queryClient.getQueryData<SeatAvailability>(showtimeKeys.availability(showtimeId));
        if (cached) return cached;
      }

      if (res && res.etag) {
        etagRef.current = res.etag;
      }

      const heldSeatIds: string[] = res?.heldSeatIds ?? [];
      const soldSeatIds: string[] = res?.soldSeatIds ?? [];
      const heldSet = new Set(heldSeatIds);
      const soldSet = new Set(soldSeatIds);

      const seats: Seat[] =
        res?.seats && res.seats.length > 0
          ? res.seats
          : BASE_HALL.map((s) => {
              if (soldSet.has(s.id)) return { ...s, status: 'sold' as const };
              if (heldSet.has(s.id)) return { ...s, status: 'held' as const };
              return { ...s, status: 'available' as const };
            });

      const totalSeats = seats.length;
      const soldCount = soldSet.size;
      const heldCount = heldSet.size;
      const availableCount = Math.max(0, totalSeats - soldCount - heldCount);

      return {
        showtimeId,
        totalSeats,
        availableCount,
        heldCount,
        soldCount,
        seats,
        etag: etagRef.current ?? '',
        serverTime: res?.serverTime ?? new Date().toISOString(),
      };
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
