import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { pool } from '../lib/db.js';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  family_id: string;
  device_id: string | null;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  revoked_at: Date | null;
  replaced_by: string | null;
  created_at: Date;
}

export class RefreshTokenRepository {
  constructor(private db: Pool = pool) {}

  async createToken(p: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceId?: string | null;
  }): Promise<RefreshTokenRow> {
    const id = `rt_${crypto.randomUUID()}`;
    const { rows } = await this.db.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (id, user_id, family_id, device_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, p.userId, p.familyId, p.deviceId || null, p.tokenHash, p.expiresAt],
    );
    return rows[0];
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const { rows } = await this.db.query<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    return rows[0] || null;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId],
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  async claimAndRotate(p: {
    oldTokenId: string;
    userId: string;
    familyId: string;
    newTokenHash: string;
    expiresAt: Date;
    deviceId?: string | null;
  }): Promise<{ ok: true; newTokenId: string } | { ok: false; reason: 'REUSE' }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const nextId = `rt_${crypto.randomUUID()}`;

      // Step 1: Atomic claim
      const updateRes = await client.query(
        `UPDATE refresh_tokens
         SET used_at = now(), replaced_by = $1
         WHERE id = $2 AND used_at IS NULL AND revoked_at IS NULL
         RETURNING id`,
        [nextId, p.oldTokenId],
      );

      if (updateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'REUSE' };
      }

      // Step 2: Insert replacement token
      await client.query(
        `INSERT INTO refresh_tokens (id, user_id, family_id, device_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nextId, p.userId, p.familyId, p.deviceId || null, p.newTokenHash, p.expiresAt],
      );

      await client.query('COMMIT');
      return { ok: true, newTokenId: nextId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
