import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load from current directory and parent (repo root) to ensure single root .env is always found
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default(
    isTest
      ? process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/matinee_test'
      : 'postgres://postgres:postgres@localhost:5432/matinee',
  ),
  DATABASE_URL_TEST: z.string().optional(),
  DATABASE_URL_READ: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('dev_jwt_access_secret_32_characters_minimum'),
  REFRESH_TOKEN_PEPPER: z.string().default('dev_refresh_token_pepper_32_characters_minimum'),
  TICKET_SIGNING_SECRET: z.string().default('dev_ticket_signing_secret_32_characters_minimum'),
  OPERATOR_API_KEY: z.string().default('dev_operator_api_key_local'),
  TMDB_READ_ACCESS_TOKEN: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  SENTRY_DSN_SERVER: z.string().optional(),
  LOADTEST_MODE: z.string().transform((v) => v === 'true' || v === '1').default('false'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
