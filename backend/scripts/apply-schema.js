const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function main() {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const filePath = path.resolve(__dirname, '../src/db/schema.sql');
  const sql = fs.readFileSync(filePath, 'utf8');

  await db.query(sql);

  const counts = await db.query(`
    select
      (select count(*) from information_schema.tables where table_name = 'saved_places') as saved_places_tables,
      (select count(*) from information_schema.tables where table_name = 'payment_methods') as payment_methods_tables,
      (select count(*) from information_schema.tables where table_name = 'emergency_contacts') as emergency_contacts_tables
  `);

  console.log(
    JSON.stringify(
      {
        ok: true,
        tables: counts.rows[0],
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
