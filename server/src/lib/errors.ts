export type ErrorCode =
  | 'SEAT_TAKEN'
  | 'HOLD_EXPIRED'
  | 'WAITING_ROOM'
  | 'WAITING_ROOM_EXPIRED'
  | 'SHOWTIME_NOT_OPEN'
  | 'SHOWTIME_CANCELLED'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_IN_FLIGHT'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'ORDER_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_PENDING'
  | 'TICKET_ALREADY_USED'
  | 'TICKET_INVALID'
  | 'SHOWTIME_NOT_FOUND'
  | 'MOVIE_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'SURGE_PROTECTION'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, statusCode = 400, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}
