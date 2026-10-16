import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming && incoming.trim() !== '' ? incoming : crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
});
