import pg from 'pg';
import { env } from '../src/config/env.js';

async function seed() {
  const connectionString = env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/matinee';
  console.log(`Seeding database: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Cinemas
    const cinemas = [
      { id: 'cinema-silverbird-vi', name: 'Silverbird Cinemas', city: 'Lagos', address: '133 Ahmadu Bello Way, Victoria Island' },
      { id: 'cinema-filmhouse-lekki', name: 'Filmhouse IMAX', city: 'Lagos', address: 'Bisway Street, Maroko, Lekki' },
    ];

    for (const c of cinemas) {
      await client.query(
        `INSERT INTO cinemas (id, name, city, address)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, address = EXCLUDED.address`,
        [c.id, c.name, c.city, c.address],
      );
    }

    // 2. Screens (3 screens of 320 seats each)
    const screens = [
      { id: 'screen-sb-1', cinema_id: 'cinema-silverbird-vi', name: 'Screen 1 (Standard)', rows: 16, seat_count: 320 },
      { id: 'screen-sb-2', cinema_id: 'cinema-silverbird-vi', name: 'Screen 2 (VIP)', rows: 16, seat_count: 320 },
      { id: 'screen-fh-1', cinema_id: 'cinema-filmhouse-lekki', name: 'Screen 1 (IMAX)', rows: 16, seat_count: 320 },
    ];

    for (const s of screens) {
      await client.query(
        `INSERT INTO screens (id, cinema_id, name, rows, seat_count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rows = EXCLUDED.rows, seat_count = EXCLUDED.seat_count`,
        [s.id, s.cinema_id, s.name, s.rows, s.seat_count],
      );
    }

    // 3. Seats (16 rows A-Q skipping I, 20 columns = 320 seats per screen)
    const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    const cols = 20;

    for (const screen of screens) {
      // Check existing seat count
      const existing = await client.query('SELECT count(*) FROM seats WHERE screen_id = $1', [screen.id]);
      if (parseInt(existing.rows[0].count, 10) === 320) {
        continue;
      }

      await client.query('DELETE FROM seats WHERE screen_id = $1', [screen.id]);

      const seatInserts: { id: string; row: string; num: number; col: number; kind: string }[] = [];
      for (let rIdx = 0; rIdx < rowLabels.length; rIdx++) {
        const row = rowLabels[rIdx];
        for (let cNum = 1; cNum <= cols; cNum++) {
          let kind = 'standard';
          if (row === 'N' || row === 'O' || row === 'P') {
            kind = 'premium';
          } else if (row === 'Q' && cNum <= 4) {
            kind = 'wheelchair';
          }
          seatInserts.push({
            id: `${screen.id}-${row}${cNum}`,
            row,
            num: cNum,
            col: cNum,
            kind,
          });
        }
      }

      for (const st of seatInserts) {
        await client.query(
          `INSERT INTO seats (id, screen_id, row_label, number, col_index, kind)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (screen_id, row_label, number) DO UPDATE SET kind = EXCLUDED.kind`,
          [st.id, screen.id, st.row, st.num, st.col, st.kind],
        );
      }
    }

    // 4. Showtimes
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const showtimes = [
      {
        id: 'st-dune-sb1-today-1800',
        movie_tmdb_id: 693134, // Dune: Part Two
        screen_id: 'screen-sb-1',
        starts_at: new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(),
        booking_opens_at: new Date(today.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        price_standard_kobo: 450000,
        price_premium_kobo: 650000,
      },
      {
        id: 'st-dune-sb1-today-2100',
        movie_tmdb_id: 693134,
        screen_id: 'screen-sb-1',
        starts_at: new Date(today.getTime() + 21 * 60 * 60 * 1000).toISOString(),
        booking_opens_at: new Date(today.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        price_standard_kobo: 450000,
        price_premium_kobo: 650000,
      },
      {
        id: 'st-dune-fh1-tomorrow-1930',
        movie_tmdb_id: 693134,
        screen_id: 'screen-fh-1',
        starts_at: new Date(tomorrow.getTime() + 19.5 * 60 * 60 * 1000).toISOString(),
        booking_opens_at: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        price_standard_kobo: 450000,
        price_premium_kobo: 650000,
      },
      {
        id: 'st-deadpool-sb2-today-1700',
        movie_tmdb_id: 533535, // Deadpool & Wolverine
        screen_id: 'screen-sb-2',
        starts_at: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(),
        booking_opens_at: new Date(today.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        price_standard_kobo: 450000,
        price_premium_kobo: 650000,
      },
    ];

    for (const st of showtimes) {
      await client.query(
        `INSERT INTO showtimes (id, movie_tmdb_id, screen_id, starts_at, booking_opens_at, status, price_standard_kobo, price_premium_kobo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           starts_at = EXCLUDED.starts_at,
           booking_opens_at = EXCLUDED.booking_opens_at,
           status = EXCLUDED.status`,
        [st.id, st.movie_tmdb_id, st.screen_id, st.starts_at, st.booking_opens_at, st.status, st.price_standard_kobo, st.price_premium_kobo],
      );
    }

    await client.query('COMMIT');

    // 5. Query and print counts (Exit criteria for M1)
    const cinemaCount = await client.query('SELECT count(*) FROM cinemas');
    const screenCount = await client.query('SELECT count(*) FROM screens');
    const seatCount = await client.query('SELECT count(*) FROM seats');
    const showtimeCount = await client.query('SELECT count(*) FROM showtimes');

    console.log('\n--- Seed Complete ---');
    console.log(`Cinemas:   ${cinemaCount.rows[0].count}`);
    console.log(`Screens:   ${screenCount.rows[0].count}`);
    console.log(`Seats:     ${seatCount.rows[0].count} (320 seats per screen)`);
    console.log(`Showtimes: ${showtimeCount.rows[0].count}`);
    console.log('---------------------\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
