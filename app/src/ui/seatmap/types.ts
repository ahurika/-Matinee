export type SeatStatus = 'available' | 'held' | 'sold'; // held = someone else is paying right now
export type SeatKind = 'standard' | 'premium' | 'wheelchair';

export type Seat = {
  id: string; // stable id from the server, for example "F-7"
  row: string; // "A", "B", ...
  number: number; // seat number inside the row, 1-based
  col: number; // grid column, 0-based, leaves gaps for aisles
  kind: SeatKind;
  status: SeatStatus;
};

// "Selected" is local UI state (not a server status). Selected seats are not held until the server confirms.
export type SeatVisual = 'available' | 'selected' | 'held' | 'sold' | 'wheelchair' | 'wheelchairSelected' | 'premium';
