import crypto from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { refundService } from '../services/refundService.js';
import { ticketService } from '../services/ticketService.js';

export const operatorRoute = new Hono();

// Operator authentication middleware
operatorRoute.use('*', async (c, next) => {
  const incomingKey = c.req.header('x-operator-key');
  if (!incomingKey) {
    throw new AppError('UNAUTHORIZED', 'Missing X-Operator-Key header', 401);
  }

  const expectedKey = env.OPERATOR_API_KEY;
  const incBuf = Buffer.from(incomingKey);
  const expBuf = Buffer.from(expectedKey);

  if (incBuf.length !== expBuf.length || !crypto.timingSafeEqual(incBuf, expBuf)) {
    throw new AppError('UNAUTHORIZED', 'Invalid operator API key', 401);
  }

  await next();
});

const verifyTicketSchema = z.object({
  token: z.string().min(1, 'token is required'),
});

operatorRoute.post('/showtimes/:id/cancel', async (c) => {
  const showtimeId = c.req.param('id');
  const result = await refundService.cancelShowtimeAndRefund(showtimeId);
  return c.json({ success: true, showtimeId, ...result }, 200);
});

operatorRoute.post('/tickets/verify', async (c) => {
  const body = await c.req.json();
  const parsed = verifyTicketSchema.parse(body);

  const result = await ticketService.verifyAndConsumeTicket(parsed.token);
  return c.json(result, 200);
});
