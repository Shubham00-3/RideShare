const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function main() {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const filePath = path.resolve(__dirname, '../src/db/dummy_seed.sql');
  const sql = fs.readFileSync(filePath, 'utf8');

  await db.query(sql);

  const counts = await db.query(`
    select
      (select count(*) from users) as users,
      (select count(*) from drivers) as drivers,
      (select count(*) from vehicles) as vehicles,
      (select count(*) from active_trips) as active_trips,
      (select count(*) from ride_requests) as ride_requests,
      (select count(*) from bookings) as bookings
  `);

  console.log(
    JSON.stringify(
      {
        ok: true,
        counts: counts.rows[0],
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error.message,
        },
        null,
        2
      )
    );
    process.exit(1);
  })
  .finally(async () => {
    const pool = db.getPool();
    if (pool) {
      await pool.end();
    }
  });
