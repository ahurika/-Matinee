// Matinee error copy. Same rules as Rota: say what happened, say what to do next, no blame, no codes.
// The server sends { error: { code, message, requestId, fields? } }. The app shows this copy, never the server message.
export type UxAction = 'retry' | 'pick-seats' | 'login' | 'pay' | 'back' | 'wait';
export type UxMessage = { title: string; message: string; action?: { label: string; kind: UxAction } };
type Params = { retryAfterSec?: number; position?: number };

const MESSAGES: Record<string, (p: Params) => UxMessage> = {
  NETWORK_ERROR: () => ({ title: 'No connection', message: 'Check your internet connection and try again.', action: { label: 'Try again', kind: 'retry' } }),
  TIMEOUT: () => ({ title: 'This is taking too long', message: 'The server did not answer in time. Try again in a moment.', action: { label: 'Try again', kind: 'retry' } }),
  SEAT_TAKEN: () => ({ title: 'Someone just took that seat', message: 'Pick another seat. The map shows what is still free.', action: { label: 'Pick seats', kind: 'pick-seats' } }),
  SEATS_UNAVAILABLE: () => ({ title: 'Some seats are no longer available', message: 'We kept the seats that are still free. Choose replacements to continue.', action: { label: 'Pick seats', kind: 'pick-seats' } }),
  HOLD_EXPIRED: () => ({ title: 'Your seats were released', message: 'You have 10 minutes to pay. Pick your seats again to continue.', action: { label: 'Pick seats', kind: 'pick-seats' } }),
  SEAT_LIMIT: () => ({ title: 'Ticket limit reached', message: 'You can book up to 8 seats in one order.' }),
  WAITING_ROOM: (p) => ({ title: 'High demand right now', message: p.position ? `You are number ${p.position} in line. Keep this screen open and we will let you in.` : 'You are in line. Keep this screen open and we will let you in.', action: { label: 'Keep waiting', kind: 'wait' } }),
  ROOM_FULL: () => ({ title: 'This showtime is very busy', message: 'Too many people are choosing seats. Try again in a few seconds.', action: { label: 'Try again', kind: 'retry' } }),
  RATE_LIMITED: (p) => ({ title: 'Slow down a little', message: `Too many requests. Try again in ${Math.max(1, p.retryAfterSec ?? 10)} seconds.` }),
  SERVICE_UNAVAILABLE: () => ({ title: 'Matinee is busy right now', message: 'We are handling a lot of bookings. Your seats are safe. Try again in a few seconds.', action: { label: 'Try again', kind: 'retry' } }),
  PAYMENT_FAILED: () => ({ title: 'Payment did not go through', message: 'You were not charged. Your seats stay held until the timer ends, so you can try again.', action: { label: 'Try again', kind: 'pay' } }),
  PAYMENT_LATE_REFUNDED: () => ({ title: 'We could not confirm your seats', message: 'Your payment arrived after the seats were released and someone else booked them. We are refunding you in full.', action: { label: 'Back to movies', kind: 'back' } }),
  SHOWTIME_CANCELLED: () => ({ title: 'This showtime was cancelled', message: 'We are refunding your tickets in full. The refund can take a few days to show up.', action: { label: 'See other times', kind: 'back' } }),
  INVALID_CREDENTIALS: () => ({ title: 'Email or password is incorrect', message: 'Check both and try again.', action: { label: 'Try again', kind: 'retry' } }),
  INVALID_REFRESH: () => ({ title: 'You have been logged out', message: 'For your security, log in again to continue.', action: { label: 'Log in', kind: 'login' } }),
  MOVIES_UNAVAILABLE: () => ({ title: 'Movie info is limited right now', message: 'We are showing saved details. Showtimes and booking still work.' }),
  NOT_FOUND: () => ({ title: 'We could not find that', message: 'It may have been removed or the link is out of date.', action: { label: 'Go back', kind: 'back' } }),
  INTERNAL: () => ({ title: 'Something went wrong on our side', message: 'Your payment and seats are safe. Try again, and contact support if it keeps happening.', action: { label: 'Try again', kind: 'retry' } }),
};

export function toUxMessage(code: string | undefined, params: Params = {}): UxMessage {
  const make = (code && MESSAGES[code]) || MESSAGES.INTERNAL;
  return make!(params);
}
