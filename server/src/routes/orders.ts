import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { userRepository } from '../repositories/userRepository.js';
import { orderService } from '../services/orderService.js';

export const ordersRoute = new Hono();

const createOrderSchema = z.object({
  showtimeId: z.string().min(1, 'showtimeId is required'),
});

ordersRoute.post(
  '/',
  requireAuth,
  rateLimit({ limitUser: 5, limitIp: 30, keyPrefix: 'rl:orders' }),
  async (c) => {
    const idempotencyKey = c.req.header('idempotency-key');
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Idempotency-Key header is required for creating orders',
        400,
      );
    }

    const authUser = c.get('user');
    const user = await userRepository.findById(authUser.id);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    const body = await c.req.json();
    const parsed = createOrderSchema.parse(body);

    const result = await orderService.createOrder({
      userId: user.id,
      showtimeId: parsed.showtimeId,
      idempotencyKey: idempotencyKey.trim(),
      requestBody: body,
      userEmail: user.email,
    });

    return c.json(result, 201);
  },
);

ordersRoute.get('/:id', requireAuth, async (c) => {
  const authUser = c.get('user');
  const orderId = c.req.param('id');

  const result = await orderService.getOrder(orderId, authUser.id);
  return c.json(result, 200);
});
