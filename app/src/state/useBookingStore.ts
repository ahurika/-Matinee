import { create } from 'zustand';

export type HoldInfo = {
  holdId: string;
  showtimeId: string;
  seatIds: string[];
  expiresAtMs: number;
  serverNowMs: number;
};

type BookingState = {
  selectedSeatIds: string[];
  activeHold: HoldInfo | null;
  toggleSeat: (seatId: string, maxSelectable?: number) => boolean;
  clearSelectedSeats: () => void;
  setActiveHold: (hold: HoldInfo | null) => void;
  clearHold: () => void;
};

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedSeatIds: [],
  activeHold: null,

  toggleSeat: (seatId: string, maxSelectable = 8) => {
    const { selectedSeatIds } = get();
    if (selectedSeatIds.includes(seatId)) {
      set({ selectedSeatIds: selectedSeatIds.filter((id) => id !== seatId) });
      return true;
    }

    if (selectedSeatIds.length >= maxSelectable) {
      return false; // Limit reached
    }

    set({ selectedSeatIds: [...selectedSeatIds, seatId] });
    return true;
  },

  clearSelectedSeats: () => set({ selectedSeatIds: [] }),
  setActiveHold: (hold) => set({ activeHold: hold }),
  clearHold: () => set({ activeHold: null, selectedSeatIds: [] }),
}));
