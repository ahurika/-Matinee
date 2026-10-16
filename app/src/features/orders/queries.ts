import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export type TicketItem = {
  bookingId: string;
  showtimeId: string;
  seatId: string;
  token: string;
  usedAt: string | null;
  seatLabel: string;
};

export type OrderDetail = {
  orderId: string;
  reference: string;
  totalKobo: number;
  subtotalKobo: number;
  feeKobo: number;
  status: 'pending' | 'paid' | 'paid_unfulfilled' | 'cancelled' | 'refunded';
  expiresAt: string;
  authorizationUrl?: string;
  tickets?: TicketItem[];
};

export type MyTicket = {
  bookingId: string;
  orderId: string;
  showtimeId: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  seatKind: string;
  movieTitle: string;
  moviePosterUrl: string | null;
  cinemaName: string;
  screenName: string;
  startsAt: string;
  status: 'confirmed' | 'cancelled';
  ticketCode: string;
  usedAt: string | null;
};

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  myTickets: () => ['tickets', 'me'] as const,
};

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showtimeId, idempotencyKey }: { showtimeId: string; idempotencyKey: string }) =>
      apiClient<OrderDetail>('/v1/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ showtimeId }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(data.orderId), data);
    },
  });
}

export function useOrderDetail(orderId: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => apiClient<{ order: OrderDetail }>(`/v1/orders/${orderId}`).then((r) => r.order),
    enabled: Boolean(orderId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      // Stop polling if order has reached a final state
      if (['paid', 'paid_unfulfilled', 'cancelled', 'refunded'].includes(data.status)) {
        return false;
      }
      return 2000;
    },
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: orderKeys.myTickets(),
    queryFn: () => apiClient<{ tickets: MyTicket[] }>('/v1/tickets').then((r) => r.tickets),
    staleTime: 30_000,
  });
}
