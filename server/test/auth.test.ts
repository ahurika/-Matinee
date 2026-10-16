import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { pool } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';

describe('Auth and Token Rotation (T4 / FR-U1)', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@testauth.matinee%']);
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  it('registers a new user with Argon2id hash and issues initial tokens', async () => {
    const res = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user1@testauth.matinee', password: 'securePassword123' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe('user1@testauth.matinee');
    expect(body.user.password_hash).toBeUndefined();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    // Verify row in database
    const dbRow = await pool.query('SELECT * FROM users WHERE email = $1', ['user1@testauth.matinee']);
    expect(dbRow.rowCount).toBe(1);
    expect(dbRow.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it('rejects registration with short password (< 10 chars)', async () => {
    const res = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'short@testauth.matinee', password: 'short' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.password).toBeDefined();
  });

  it('logs in successfully and rejects invalid credentials with identical error', async () => {
    await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@testauth.matinee', password: 'correctPassword123' }),
    });

    // Valid login
    const validRes = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@testauth.matinee', password: 'correctPassword123' }),
    });
    expect(validRes.status).toBe(200);

    // Wrong password
    const wrongPwRes = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@testauth.matinee', password: 'wrongPassword999' }),
    });
    expect(wrongPwRes.status).toBe(401);
    const wrongPwBody = (await wrongPwRes.json()) as any;
    expect(wrongPwBody.error.message).toBe('Invalid email or password');

    // Unknown user
    const unknownRes = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@testauth.matinee', password: 'correctPassword123' }),
    });
    expect(unknownRes.status).toBe(401);
    const unknownBody = (await unknownRes.json()) as any;
    expect(unknownBody.error.message).toBe('Invalid email or password');
  });

  it('rotates refresh tokens and detects token reuse (T4)', async () => {
    const regRes = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rotate@testauth.matinee', password: 'passwordForRotation123' }),
    });
    const { refreshToken: r1 } = (await regRes.json()) as any;

    // First refresh with r1: should succeed and return r2
    const ref1Res = await app.request('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: r1 }),
    });
    expect(ref1Res.status).toBe(200);
    const { refreshToken: r2, accessToken: a2 } = (await ref1Res.json()) as any;
    expect(r2).not.toBe(r1);
    expect(a2).toBeTruthy();

    // Replay attack / Reuse detection: adversary tries using old r1 again!
    const replayRes = await app.request('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: r1 }),
    });
    expect(replayRes.status).toBe(401);
    const replayBody = (await replayRes.json()) as any;
    expect(replayBody.error.message).toMatch(/reuse detected/i);

    // Because reuse was detected, the entire token family must now be revoked
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', ['rotate@testauth.matinee']);
    const userId = userRes.rows[0].id;
    const tokensRes = await pool.query('SELECT * FROM refresh_tokens WHERE user_id = $1', [userId]);
    for (const t of tokensRes.rows) {
      expect(t.revoked_at).not.toBeNull();
    }

    // Even the legitimate r2 token now fails because the family was revoked
    const ref2Res = await app.request('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: r2 }),
    });
    expect(ref2Res.status).toBe(401);
  });

  it('logout-all immediately revokes active access tokens via token_version check', async () => {
    const regRes = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'logoutall@testauth.matinee', password: 'logoutAllPassword123' }),
    });
    const { accessToken: tokenBeforeLogoutAll } = (await regRes.json()) as any;

    // Access protected /me route
    const meResBefore = await app.request('/v1/auth/me', {
      headers: { Authorization: `Bearer ${tokenBeforeLogoutAll}` },
    });
    expect(meResBefore.status).toBe(200);

    // Call logout-all
    const logoutAllRes = await app.request('/v1/auth/logout-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBeforeLogoutAll}` },
    });
    expect(logoutAllRes.status).toBe(200);

    // Now, the previous access token MUST fail immediately even though 15m did not pass!
    const meResAfter = await app.request('/v1/auth/me', {
      headers: { Authorization: `Bearer ${tokenBeforeLogoutAll}` },
    });
    expect(meResAfter.status).toBe(401);
    const body = (await meResAfter.json()) as any;
    expect(body.error.message).toMatch(/session revoked/i);
  });
});
