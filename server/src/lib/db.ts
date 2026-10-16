import pg from 'pg';
import { env } from '../config/env.js';

const connectionString = env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/matinee';

export const pool = new pg.Pool({
  connectionString,
  max: 10,
});

export const poolRead = env.DATABASE_URL_READ
  ? new pg.Pool({ connectionString: env.DATABASE_URL_READ, max: 10 })
  : pool;
