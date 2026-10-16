import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { userRepository } from '../repositories/userRepository.js';
import { authService } from '../services/authService.js';

export const authRoute = new Hono();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Invalid refresh token'),
  deviceId: z.string().optional(),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

authRoute.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.parse(body);

  const result = await authService.register(parsed);
  return c.json(result, 201);
});

authRoute.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.parse(body);

  const result = await authService.login(parsed);
  return c.json(result, 200);
});

authRoute.post('/refresh', async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.parse(body);

  const result = await authService.refresh(parsed.refreshToken, parsed.deviceId);
  return c.json(result, 200);
});

authRoute.post('/logout', async (c) => {
  const body = await c.req.json();
  const parsed = logoutSchema.parse(body);

  await authService.logout(parsed.refreshToken);
  return c.json({ success: true }, 200);
});

authRoute.post('/logout-all', requireAuth, async (c) => {
  const user = c.get('user');
  await authService.logoutAll(user.id);
  return c.json({ success: true }, 200);
});

authRoute.get('/me', requireAuth, async (c) => {
  const authUser = c.get('user');
  const user = await userRepository.findById(authUser.id);
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
  }
  const { password_hash: _, ...safeUser } = user;
  return c.json({ user: safeUser }, 200);
});
