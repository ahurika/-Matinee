import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { pool } from '../lib/db.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  token_version: number;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  constructor(private db: Pool = pool) {}

  async createUser(p: { email: string; passwordHash: string }): Promise<UserRow> {
    const id = `usr_${crypto.randomUUID()}`;
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (id, email, password_hash, token_version)
       VALUES ($1, LOWER($2), $3, 0)
       RETURNING id, email, password_hash, token_version, created_at, updated_at`,
      [id, p.email, p.passwordHash],
    );
    return rows[0];
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT id, email, password_hash, token_version, created_at, updated_at
       FROM users
       WHERE email = LOWER($1)`,
      [email],
    );
    return rows[0] || null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT id, email, password_hash, token_version, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async incrementTokenVersion(id: string): Promise<number> {
    const { rows } = await this.db.query<{ token_version: number }>(
      `UPDATE users
       SET token_version = token_version + 1, updated_at = now()
       WHERE id = $1
       RETURNING token_version`,
      [id],
    );
    return rows[0]?.token_version ?? 0;
  }
}

export const userRepository = new UserRepository();
