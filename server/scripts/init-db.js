import pg from 'pg';

const rootConn = process.env.ROOT_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';

async function init() {
  const pool = new pg.Pool({ connectionString: rootConn });
  try {
    const dbs = ['matinee', 'matinee_test'];
    for (const db of dbs) {
      const res = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
      if (res.rowCount === 0) {
        console.log(`Creating database ${db}...`);
        await pool.query(`CREATE DATABASE ${db}`);
        console.log(`Database ${db} created successfully.`);
      } else {
        console.log(`Database ${db} already exists.`);
      }
    }
  } catch (err) {
    console.error('Error creating databases:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
