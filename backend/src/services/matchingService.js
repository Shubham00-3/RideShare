const seedCandidates = require('../data/seedCandidates');
const db = require('../config/db');

function toNumber(value) {
  return Number(value || 0);
}

function normalizeLocation(value, fallback) {
  return value && String(value).trim().length > 0 ? String(value).trim() : fallback;
}

function corridorFromLabels(pickup, dropoff) {
  const normalized = `${pickup} ${dropoff}`.toLowerCase();

  if (normalized.includes('connaught') || normalized.includes('rajiv') || normalized.includes('akshardham') || normalized.includes('noida')) {
    return {
      corridorId: 'delhi_cp_noida',
      corridorLabel: 'Connaught Place -> East Delhi / Noida',
      direction: 'eastbound',
      originKm: 0,
      destinationKm: 15,
      distanceKm: 15,
      durationMinutes: 35,
    };
  }

  if (normalized.includes('gurgaon') || normalized.includes('cyber')) {
    return {
      corridorId: 'gurgaon_cp_central',
      corridorLabel: 'Gurgaon -> Central Delhi',
      direction: 'northbound',
      originKm: 0,
      destinationKm: 24,
      distanceKm: 24,
      durationMinutes: 50,
    };
  }

  return {
    corridorId: 'generic_city_corridor',
    corridorLabel: `${pickup.split(',')[0]} -> ${dropoff.split(',')[0]}`,
    direction: 'outbound',
    originKm: 0,
    destinationKm: 12,
    distanceKm: 12,
    durationMinutes: 30,
  };
}

function buildRideRequest(payload) {
  const pickup = normalizeLocation(payload.pickup, 'Connaught Place, New Delhi');
  const dropoff = normalizeLocation(payload.dropoff, 'Akshardham Temple, Delhi');
  const corridor = corridorFromLabels(pickup, dropoff);

  return {
    id: `req_${Date.now()}`,
    pickup,
    dropoff,
    rideType: payload.rideType || 'shared',
    seatsRequired: Number(payload.seatsRequired || 1),
    allowMidTripPickup: payload.allowMidTripPickup ?? true,
    departureTime: payload.departureTime || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    corridorId: corridor.corridorId,
    corridorLabel: corridor.corridorLabel,
    direction: corridor.direction,
    originKm: corridor.originKm,
    destinationKm: corridor.destinationKm,
    distanceKm: corridor.distanceKm,
    durationMinutes: corridor.durationMinutes,
  };
}

async function persistRideRequest(request, options = {}) {
  const pool = db.getPool();

  if (!pool) {
    return request;
  }

  const { userId = null } = options;

  const corridorId =
    request.corridorId && request.corridorId !== 'generic_city_corridor'
      ? request.corridorId
      : null;

  const insertQuery = `
    insert into ride_requests (
      rider_id,
      corridor_id,
      pickup_label,
      dropoff_label,
      origin_km,
      destination_km,
      ride_type,
      seats_required,
      allow_mid_trip_pickup,
      departure_time,
      status
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'searching')
    returning id
  `;

  const result = await db.query(insertQuery, [
    userId,
    corridorId,
    request.pickup,
    request.dropoff,
    request.originKm,
    request.destinationKm,
    request.rideType,
    request.seatsRequired,
    request.allowMidTripPickup,
    request.departureTime,
  ]);

  return {
    ...request,
    id: result.rows[0]?.id || request.id,
  };
}

function overlapWindow(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart).getTime() <= new Date(bEnd).getTime() &&
    new Date(bStart).getTime() <= new Date(aEnd).getTime();
}

function overlapScore(request, candidate) {
  const overlapKm = Math.max(
    0,
    Math.min(request.destinationKm, candidate.destination_km) -
      Math.max(request.originKm, candidate.origin_km)
  );
  const requestDistance = Math.max(request.destinationKm - request.originKm, 1);
  const overlapRatio = overlapKm / requestDistance;
  const detourMinutes =
    Math.abs(request.originKm - candidate.origin_km) * 1.1 +
    Math.abs(request.destinationKm - candidate.destination_km) * 1.4;

  return {
    overlapKm: Number(overlapKm.toFixed(1)),
    overlapRatio: Number(overlapRatio.toFixed(2)),
    detourMinutes: Number(detourMinutes.toFixed(0)),
    score: Number((overlapRatio * 100 - detourMinutes).toFixed(1)),
  };
}

function vehicleVariants(candidate, overlapRatio) {
  const sharedMultiplier = 1 - Math.min(overlapRatio * 0.25, 0.2);
  const baseRatePerKm = toNumber(candidate.vehicle_rate_per_km);
  const baseFare = Math.round(toNumber(candidate.base_solo_fare) * sharedMultiplier);

  return [
    {
      providerVehicleId: `${candidate.id}_economy`,
      name: candidate.vehicle_name,
      type: candidate.vehicle_type,
      category: candidate.vehicle_category,
      distance: `${candidate.available_seats * 120} m`,
      eta: `${candidate.vehicle_eta_minutes} min`,
      seats: candidate.available_seats,
      fare: `₹${baseFare}`,
      fareValue: baseFare,
      farePerKm: `₹${baseRatePerKm}/km`,
      driver: {
        name: candidate.driver_name,
        rating: toNumber(candidate.driver_rating),
        trips: candidate.driver_trip_count,
      },
    },
    {
      providerVehicleId: `${candidate.id}_comfort`,
      name: candidate.vehicle_category === 'premium' ? candidate.vehicle_name : 'Toyota Innova',
      type: candidate.vehicle_category === 'premium' ? candidate.vehicle_type : 'Comfort Plus',
      category: candidate.vehicle_category === 'premium' ? candidate.vehicle_category : 'comfort',
      distance: `${candidate.available_seats * 160} m`,
      eta: `${candidate.vehicle_eta_minutes + 2} min`,
      seats: Math.max(candidate.available_seats, 3),
      fare: `₹${baseFare + 60}`,
      fareValue: baseFare + 60,
      farePerKm: `₹${baseRatePerKm + 2}/km`,
      driver: {
        name: candidate.driver_name,
        rating: toNumber(candidate.driver_rating),
        trips: candidate.driver_trip_count,
      },
    },
  ];
}

async function fetchCandidateRows(request) {
  const query = `
    select
      t.id,
      c.id as corridor_id,
      c.label as corridor_label,
      c.direction,
      t.origin_label,
      t.destination_label,
      t.origin_km,
      t.destination_km,
      t.departure_window_start,
      t.departure_window_end,
      t.base_solo_fare,
      t.available_seats,
      t.allow_mid_trip_join,
      d.full_name as driver_name,
      d.rating as driver_rating,
      d.trip_count as driver_trip_count,
      v.display_name as vehicle_name,
      v.vehicle_type,
      v.category as vehicle_category,
      v.rate_per_km as vehicle_rate_per_km,
      v.eta_minutes as vehicle_eta_minutes
    from active_trips t
    join corridors c on c.id = t.corridor_id
    join drivers d on d.id = t.driver_id
    join vehicles v on v.id = t.vehicle_id
    where t.status = 'open'
      and t.corridor_id = $1
      and c.direction = $2
      and t.available_seats >= $3
  `;

  const result = await db.query(query, [
    request.corridorId,
    request.direction,
    request.seatsRequired,
  ]);

  return result.rows.length > 0 ? result.rows : seedCandidates;
}

async function previewMatches(payload, options = {}) {
  const initialRequest = buildRideRequest(payload);
  const request = await persistRideRequest(initialRequest, options);
  const candidates = await fetchCandidateRows(request);

  const matches = candidates
    .filter((candidate) => candidate.available_seats >= request.seatsRequired)
    .filter((candidate) =>
      overlapWindow(
        request.departureTime,
        new Date(new Date(request.departureTime).getTime() + 20 * 60 * 1000).toISOString(),
        candidate.departure_window_start,
        candidate.departure_window_end
      )
    )
    .map((candidate) => {
      const metrics = overlapScore(request, candidate);
      const soloFareValue = toNumber(candidate.base_solo_fare);
      const sharedFareValue = Math.round(soloFareValue * (1 - metrics.overlapRatio * 0.4));
      const savingsValue = Math.max(soloFareValue - sharedFareValue, 60);

      return {
        id: candidate.id,
        requestId: request.id,
        passenger: {
          name: 'Compatible corridor rider',
          rating: 4.8,
          verified: true,
          avatar: null,
        },
        pickup: candidate.origin_label,
        dropoff: candidate.destination_label,
        overlap: Math.round(metrics.overlapRatio * 100),
        overlapRatio: metrics.overlapRatio,
        overlapKm: metrics.overlapKm,
        savings: `₹${savingsValue}`,
        savingsValue,
        sharedFare: `₹${sharedFareValue}`,
        sharedFareValue,
        soloFare: `₹${soloFareValue}`,
        soloFareValue,
        eta: `${candidate.vehicle_eta_minutes} min`,
        detour: `+${metrics.detourMinutes} min`,
        detourMinutes: metrics.detourMinutes,
        score: metrics.score,
        vehicles: vehicleVariants(candidate, metrics.overlapRatio),
        driverPoolHeadline: candidate.allow_mid_trip_join
          ? 'Eligible for dynamic mid-trip pickup'
          : 'Locked direct ride with driver priority',
      };
    })
    .filter((match) => match.overlapRatio >= 0.35)
    .sort((left, right) => right.score - left.score);

  return {
    request,
    matches,
    source: matches.length > 0 ? 'database-or-seed' : 'empty',
  };
}

module.exports = {
  previewMatches,
};
