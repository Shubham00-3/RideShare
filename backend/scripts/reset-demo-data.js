const db = require('../src/config/db');
const { syncActiveTripRoutes } = require('./sync-active-trip-routes');

async function main() {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const result = await db.query(`
    update active_trips
    set
      status = 'open',
      available_seats = case id
        when 'trip_corridor_1' then 2
        when 'trip_corridor_2' then 3
        when 'trip_corridor_3' then 1
        when 'trip_corridor_4' then 3
        when 'trip_corridor_5' then 2
        when 'trip_corridor_6' then 2
        when 'trip_corridor_7' then 3
        else available_seats
      end,
      departure_window_start = case id
        when 'trip_corridor_1' then now() - interval '5 minutes'
        when 'trip_corridor_2' then now() - interval '8 minutes'
        when 'trip_corridor_3' then now() - interval '12 minutes'
        when 'trip_corridor_4' then now() - interval '10 minutes'
        when 'trip_corridor_5' then now() - interval '6 minutes'
        when 'trip_corridor_6' then now() - interval '9 minutes'
        when 'trip_corridor_7' then now() - interval '7 minutes'
        else now() - interval '5 minutes'
      end,
      departure_window_end = case id
        when 'trip_corridor_1' then now() + interval '20 minutes'
        when 'trip_corridor_2' then now() + interval '22 minutes'
        when 'trip_corridor_3' then now() + interval '28 minutes'
        when 'trip_corridor_4' then now() + interval '25 minutes'
        when 'trip_corridor_5' then now() + interval '18 minutes'
        when 'trip_corridor_6' then now() + interval '24 minutes'
        when 'trip_corridor_7' then now() + interval '26 minutes'
        else now() + interval '20 minutes'
      end
    where id in (
      'trip_corridor_1',
      'trip_corridor_2',
      'trip_corridor_3',
      'trip_corridor_4',
      'trip_corridor_5',
      'trip_corridor_6',
      'trip_corridor_7'
    )
    returning id, available_seats, departure_window_start, departure_window_end
  `);
  const syncedTrips = await syncActiveTripRoutes();

  console.log(
    JSON.stringify(
      {
        ok: true,
        resetTrips: result.rows,
        syncedTrips,
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
