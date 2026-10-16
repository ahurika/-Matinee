import type { Pool } from 'pg';
import { pool } from '../lib/db.js';

export type IdempotencyAcquireResult =
  | { status: 'ACQUIRED' }
  | { status: 'CONFLICT' }
  | { status: 'IN_PROGRESS' }
  | { status: 'COMPLETED'; responseStatus: number; responseBody: unknown };

export class IdempotencyRepository {
  constructor(private db: Pool = pool) {}

  async acquire(p: {
    userId: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
  }): Promise<IdempotencyAcquireResult> {
    const existing = await this.db.query<{
      request_hash: string;
      response_status: number | null;
      response_body: unknown;
      status: string;
      expires_at: Date;
    }>(
      `SELECT request_hash, response_status, response_body, status, expires_at
       FROM idempotency_keys
       WHERE user_id = $1 AND key = $2`,
      [p.userId, p.key],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0];
      if (row.request_hash !== p.requestHash) {
        return { status: 'CONFLICT' };
      }
      if (row.status === 'completed' && row.response_status !== null) {
        return {
          status: 'COMPLETED',
          responseStatus: row.response_status,
          responseBody: row.response_body,
        };
      }
      return { status: 'IN_PROGRESS' };
    }

    try {
      await this.db.query(
        `INSERT INTO idempotency_keys (user_id, key, request_hash, status, expires_at)
         VALUES ($1, $2, $3, 'in_progress', $4)`,
        [p.userId, p.key, p.requestHash, p.expiresAt],
      );
      return { status: 'ACQUIRED' };
    } catch (err: any) {
      // Unique violation race
      if (err.code === '23505') {
        return this.acquire(p);
      }
      throw err;
    }
  }

  async saveResponse(p: {
    userId: string;
    key: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void> {
    await this.db.query(
      `UPDATE idempotency_keys
       SET response_status = $1, response_body = $2, status = 'completed'
       WHERE user_id = $3 AND key = $4`,
      [p.responseStatus, JSON.stringify(p.responseBody), p.userId, p.key],
    );
  }
}

export const idempotencyRepository = new IdempotencyRepository();
