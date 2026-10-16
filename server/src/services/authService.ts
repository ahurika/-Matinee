import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { userRepository, type UserRow } from '../repositories/userRepository.js';

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPayload {
  sub: string; // userId
  sid: string; // familyId
  tv: number;  // tokenVersion
}

export class AuthService {
  private secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  async verifyPassword(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      return false;
    }
  }

  generateRawRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  hashRefreshToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken + env.REFRESH_TOKEN_PEPPER).digest('hex');
  }

  async signAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({
      sub: payload.sub,
      sid: payload.sid,
      tv: payload.tv,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
      .sign(this.secretKey);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey);
      return {
        sub: String(payload.sub),
        sid: String(payload.sid),
        tv: Number(payload.tv ?? 0),
      };
    } catch (err) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401);
    }
  }

  async register(p: { email: string; password: string }): Promise<{ user: Omit<UserRow, 'password_hash'>; accessToken: string; refreshToken: string }> {
    const existing = await userRepository.findByEmail(p.email);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'Email is already registered', 400, { email: ['Email already in use'] });
    }

    const passwordHash = await this.hashPassword(p.password);
    const user = await userRepository.createUser({ email: p.email, passwordHash });

    const familyId = `fam_${crypto.randomUUID()}`;
    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await refreshTokenRepository.createToken({
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt,
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      sid: familyId,
      tv: user.token_version,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  async login(p: { email: string; password: string; deviceId?: string }): Promise<{ user: Omit<UserRow, 'password_hash'>; accessToken: string; refreshToken: string }> {
    const user = await userRepository.findByEmail(p.email);
    if (!user) {
      // Timing defence: run a dummy verify so response duration is consistent
      await this.hashPassword(p.password);
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const valid = await this.verifyPassword(user.password_hash, p.password);
    if (!valid) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const familyId = `fam_${crypto.randomUUID()}`;
    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await refreshTokenRepository.createToken({
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt,
      deviceId: p.deviceId,
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      sid: familyId,
      tv: user.token_version,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  async refresh(rawToken: string, deviceId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.hashRefreshToken(rawToken);
    const row = await refreshTokenRepository.findByHash(hash);

    if (!row) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }

    // If revoked or expired
    if (row.revoked_at || row.expires_at.getTime() < Date.now()) {
      throw new AppError('UNAUTHORIZED', 'Refresh token expired or revoked', 401);
    }

    // Reuse detected: someone is replaying a previously used token
    if (row.used_at !== null) {
      await refreshTokenRepository.revokeFamily(row.family_id);
      console.warn(`[AuthReuseDetected] Revoked family=${row.family_id} user=${row.user_id}`);
      throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.', 401);
    }

    const nextRawToken = this.generateRawRefreshToken();
    const nextHash = this.hashRefreshToken(nextRawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const rotationResult = await refreshTokenRepository.claimAndRotate({
      oldTokenId: row.id,
      userId: row.user_id,
      familyId: row.family_id,
      newTokenHash: nextHash,
      expiresAt,
      deviceId: deviceId || row.device_id,
    });

    if (!rotationResult.ok) {
      await refreshTokenRepository.revokeFamily(row.family_id);
      console.warn(`[AuthRaceReuse] Concurrent token rotation for family=${row.family_id}`);
      throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Please log in again.', 401);
    }

    const user = await userRepository.findById(row.user_id);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    const accessToken = await this.signAccessToken({
      sub: user.id,
      sid: row.family_id,
      tv: user.token_version,
    });

    return { accessToken, refreshToken: nextRawToken };
  }

  async logout(rawToken: string): Promise<void> {
    const hash = this.hashRefreshToken(rawToken);
    const row = await refreshTokenRepository.findByHash(hash);
    if (row) {
      await refreshTokenRepository.revokeFamily(row.family_id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    const newVersion = await userRepository.incrementTokenVersion(userId);
    await refreshTokenRepository.revokeAllForUser(userId);

    // Update Redis cache for immediate invalidation of existing JWTs
    try {
      await redis.set(`tv:${userId}`, newVersion, 'EX', 7 * 24 * 60 * 60);
    } catch (err) {
      console.error('Failed to update Redis token version:', err);
    }
  }

  async checkTokenVersion(userId: string, tokenVersionInJwt: number): Promise<boolean> {
    try {
      const cached = await redis.get(`tv:${userId}`);
      if (cached !== null) {
        return tokenVersionInJwt >= parseInt(cached, 10);
      }
    } catch {
      // Redis fallback: read from DB
    }

    const user = await userRepository.findById(userId);
    if (!user) return false;

    try {
      await redis.set(`tv:${userId}`, user.token_version, 'EX', 3600);
    } catch {}

    return tokenVersionInJwt >= user.token_version;
  }
}

export const authService = new AuthService();
