import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      },
      err.statusCode as any,
    );
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'body';
      fields[path] = fields[path] || [];
      fields[path].push(issue.message);
    }
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          requestId,
          fields,
        },
      },
      400,
    );
  }

  console.error(`[UnhandledError] [${requestId}]`, err);

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred',
        requestId,
      },
    },
    500,
  );
}
