import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const connectionString = env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/matinee';
  console.log(`Running migrations against ${connectionString.replace(/:[^:@]+@/, ':****@')}...`);

  const pool = new pg.Pool({ connectionString });
  try {
    const schemaPath = path.resolve(__dirname, '../src/repositories/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(sql);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
