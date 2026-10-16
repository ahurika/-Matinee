import { createMiddleware } from 'hono/factory';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { authService } from '../services/authService.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      familyId: string;
      tokenVersion: number;
    };
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  if (env.LOADTEST_MODE && env.NODE_ENV !== 'production') {
    const testUserId = c.req.header('x-user-id');
    if (testUserId) {
      c.set('user', {
        id: testUserId,
        familyId: `fam_${testUserId}`,
        tokenVersion: 1,
      });
      await next();
      return;
    }
  }

  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401);
  }

  const token = authHeader.substring(7).trim();
  const payload = await authService.verifyAccessToken(token);

  const isValidVersion = await authService.checkTokenVersion(payload.sub, payload.tv);
  if (!isValidVersion) {
    throw new AppError('UNAUTHORIZED', 'Session revoked. Please log in again.', 401);
  }

  c.set('user', {
    id: payload.sub,
    familyId: payload.sid,
    tokenVersion: payload.tv,
  });

  await next();
});
