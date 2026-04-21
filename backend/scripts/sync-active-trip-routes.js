const db = require('../src/config/db');
const { buildRoutePreview, findFallbackPlaceByLabel } = require('../src/services/mappingService');

const LABEL_ALIASES = {
  Akshardham: 'Akshardham Temple, Delhi',
  'Barakhamba Road': 'Barakhamba Road, New Delhi',
  'Connaught Place': 'Connaught Place, New Delhi',
  'Cyber Hub': 'DLF Cyber City, Gurgaon',
  'DLF Cyber City': 'DLF Cyber City, Gurgaon',
  'India Gate': 'India Gate, New Delhi',
  'Mandi House': 'Mandi House, New Delhi',
  'Mayur Vihar Phase 1': 'Mayur Vihar Phase 1, Delhi',
  'Noida Sector 15': 'Noida Sector 15, Noida',
  'Noida Sector 18': 'Sector 18, Noida',
  'Patel Chowk': 'Patel Chowk, New Delhi',
  'Rajiv Chowk Metro': 'Rajiv Chowk Metro Station, New Delhi',
  'Rajiv Chowk Metro Station': 'Rajiv Chowk Metro Station, New Delhi',
  'Udyog Vihar Phase 2': 'Udyog Vihar Phase 2, Gurgaon',
};

function resolvePlace(label) {
  return findFallbackPlaceByLabel(LABEL_ALIASES[label] || label);
}

async function syncActiveTripRoutes() {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const trips = await db.query(`
    select
      id,
      origin_label,
      destination_label,
      status
    from active_trips
    order by id asc
  `);

  const syncedTrips = [];

  for (const trip of trips.rows) {
    const origin = resolvePlace(trip.origin_label);
    const destination = resolvePlace(trip.destination_label);

    if (!origin || !destination) {
      continue;
    }

    const route = await buildRoutePreview({
      pickup: origin,
      dropoff: destination,
    });

    await db.query(
      `
        update active_trips
        set
          route_geometry = $2::jsonb,
          route_distance_meters = $3,
          route_duration_seconds = $4,
          current_lat = case
            when status in ('completed', 'cancelled') then $6::numeric
            else $5::numeric
          end,
          current_lng = case
            when status in ('completed', 'cancelled') then $7::numeric
            else $8::numeric
          end,
          last_location_at = now()
        where id = $1
      `,
      [
        trip.id,
        JSON.stringify(route.geometry),
        Math.round(route.distanceKm * 1000),
        route.durationSeconds,
        origin.coordinates.latitude,
        destination.coordinates.latitude,
        destination.coordinates.longitude,
        origin.coordinates.longitude,
      ]
    );

    syncedTrips.push({
      id: trip.id,
      routeDistanceMeters: Math.round(route.distanceKm * 1000),
      routeDurationSeconds: route.durationSeconds,
      source: route.source,
    });
  }

  return syncedTrips;
}

async function main() {
  const syncedTrips = await syncActiveTripRoutes();

  console.log(
    JSON.stringify(
      {
        ok: true,
        syncedTrips,
      },
      null,
      2
    )
  );
}

if (require.main === module) {
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
}

module.exports = {
  syncActiveTripRoutes,
};
