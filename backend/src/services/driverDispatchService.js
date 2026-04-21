const db = require('../config/db');
const { getBookingById, getDriverBookings } = require('./bookingService');
const { getGeometryOverlapScore, toNumber } = require('./routeMath');

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function computeCorridorOverlapScore(request, trip) {
  const overlapKm = Math.max(
    0,
    Math.min(toNumber(request.destination_km), toNumber(trip.destination_km)) -
      Math.max(toNumber(request.origin_km), toNumber(trip.origin_km))
  );
  const requestDistance = Math.max(
    toNumber(request.destination_km) - toNumber(request.origin_km),
    1
  );
  const overlapRatio = overlapKm / requestDistance;
  const detourMinutes =
    Math.abs(toNumber(request.origin_km) - toNumber(trip.origin_km)) * 1.1 +
    Math.abs(toNumber(request.destination_km) - toNumber(trip.destination_km)) * 1.4;

  return {
    detourMinutes: Number(detourMinutes.toFixed(0)),
    overlapKm: Number(overlapKm.toFixed(1)),
    overlapRatio: Number(overlapRatio.toFixed(2)),
    score: Number((overlapRatio * 100 - detourMinutes).toFixed(1)),
  };
}

function overlapScore(request, trip) {
  const geometryOverlap =
    request.route_geometry && trip.route_geometry
      ? getGeometryOverlapScore({
          requestDistanceKm:
            Math.max(toNumber(request.destination_km) - toNumber(request.origin_km), 1),
          requestGeometry: request.route_geometry,
          candidateGeometry: trip.route_geometry,
        })
      : null;

  if (geometryOverlap) {
    const detourMinutes =
      Math.abs(toNumber(request.origin_km) - toNumber(trip.origin_km)) * 0.8 +
      Math.abs(toNumber(request.destination_km) - toNumber(trip.destination_km)) * 1.05;

    return {
      detourMinutes: Number(detourMinutes.toFixed(0)),
      overlapKm: geometryOverlap.overlapKm,
      overlapRatio: geometryOverlap.overlapRatio,
      score: Number((geometryOverlap.overlapRatio * 115 - detourMinutes).toFixed(1)),
    };
  }

  return computeCorridorOverlapScore(request, trip);
}

async function getDriverRecord(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return null;
  }

  const result = await db.query(
    `
      select
        d.id,
        d.full_name,
        d.is_online,
        d.return_trip_available,
        d.rating,
        d.trip_count,
        u.phone,
        u.email
      from drivers d
      join users u on u.id = d.user_id
      where d.user_id = $1
      limit 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getDriverOpenTrips(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return [];
  }

  const result = await db.query(
    `
      select
        at.id,
        at.corridor_id,
        at.origin_label,
        at.destination_label,
        at.origin_km,
        at.destination_km,
        at.available_seats,
        at.allow_mid_trip_join,
        at.base_solo_fare,
        at.departure_window_start,
        at.departure_window_end,
        at.route_geometry,
        v.display_name as vehicle_name,
        v.vehicle_type,
        v.eta_minutes as vehicle_eta_minutes
      from active_trips at
      join drivers d on d.id = at.driver_id
      join vehicles v on v.id = at.vehicle_id
      where d.user_id = $1
        and at.status in ('open', 'in_progress')
      order by at.departure_window_start asc
    `,
    [userId]
  );

  return result.rows;
}

function estimateDispatchFare(request, trip, overlap) {
  const baseSoloFare = Math.round(toNumber(trip.base_solo_fare));
  const sharedFareValue = Math.max(
    Math.round(baseSoloFare * (1 - overlap.overlapRatio * 0.35)),
    120
  );
  const estimatedSavings = Math.max(baseSoloFare - sharedFareValue, 0);

  return {
    estimatedFare: sharedFareValue,
    estimatedSavings,
  };
}

async function getIncomingRequestsForDriver(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return [];
  }

  const driver = await getDriverRecord(userId);

  if (!driver?.is_online) {
    return [];
  }

  const openTrips = await getDriverOpenTrips(userId);

  if (openTrips.length === 0) {
    return [];
  }

  const corridorIds = [...new Set(openTrips.map((trip) => trip.corridor_id))];
  const result = await db.query(
    `
      select
        rr.id,
        rr.pickup_label,
        rr.dropoff_label,
        rr.origin_km,
        rr.destination_km,
        rr.ride_type,
        rr.seats_required,
        rr.allow_mid_trip_pickup,
        rr.departure_time,
        rr.created_at,
        rr.route_geometry,
        rider.full_name as rider_name,
        rider.phone as rider_phone,
        rr.corridor_id
      from ride_requests rr
      left join users rider on rider.id = rr.rider_id
      where rr.status = 'searching'
        and rr.corridor_id = any($1::text[])
        and rr.created_at >= now() - interval '30 minutes'
      order by rr.created_at desc
      limit 10
    `,
    [corridorIds]
  );

  return result.rows
    .map((request) => {
      const compatibleTrips = openTrips
        .filter(
          (trip) =>
            trip.corridor_id === request.corridor_id &&
            trip.available_seats >= request.seats_required
        )
        .map((trip) => ({
          overlap: overlapScore(request, trip),
          trip,
        }))
        .filter((candidate) => candidate.overlap.overlapRatio >= 0.35)
        .sort((left, right) => right.overlap.score - left.overlap.score);

      const bestCandidate = compatibleTrips[0];

      if (!bestCandidate) {
        return null;
      }

      const fare = estimateDispatchFare(request, bestCandidate.trip, bestCandidate.overlap);

      return {
        estimatedFare: fare.estimatedFare,
        estimatedSavings: fare.estimatedSavings,
        id: request.id,
        overlapKm: bestCandidate.overlap.overlapKm,
        overlapRatio: bestCandidate.overlap.overlapRatio,
        pickup: request.pickup_label,
        dropoff: request.dropoff_label,
        rider: {
          name: request.rider_name || 'Nearby rider',
          phone: request.rider_phone || null,
        },
        rideType: request.ride_type,
        seatsRequired: request.seats_required,
        suggestedTrip: {
          etaMinutes: bestCandidate.trip.vehicle_eta_minutes,
          id: bestCandidate.trip.id,
          routeLabel: `${bestCandidate.trip.origin_label} -> ${bestCandidate.trip.destination_label}`,
          vehicleName: bestCandidate.trip.vehicle_name,
          vehicleType: bestCandidate.trip.vehicle_type,
        },
      };
    })
    .filter(Boolean);
}

async function getDriverDashboard(userId) {
  const driver = await getDriverRecord(userId);
  const tripsPayload = await getDriverBookings(userId);
  const pendingRequests = await getIncomingRequestsForDriver(userId);

  return {
    driver: driver
      ? {
          email: driver.email,
          isOnline: driver.is_online,
          name: driver.full_name,
          phone: driver.phone,
          rating: toNumber(driver.rating),
          returnTripAvailable: driver.return_trip_available,
          tripCount: toNumber(driver.trip_count),
        }
      : null,
    items: tripsPayload.items,
    pendingRequests,
    summary: {
      ...tripsPayload.summary,
      pendingRequests: pendingRequests.length,
    },
  };
}

async function updateDriverAvailability(userId, payload = {}) {
  const pool = db.getPool();

  if (!pool || !userId) {
    throw new Error('Database is required for driver settings.');
  }

  const current = await getDriverRecord(userId);

  if (!current) {
    throw buildStatusError('Driver profile not found.', 404);
  }

  const nextIsOnline =
    typeof payload.isOnline === 'boolean' ? payload.isOnline : current.is_online;
  const nextReturnTrip =
    typeof payload.returnTripAvailable === 'boolean'
      ? payload.returnTripAvailable
      : current.return_trip_available;

  await db.query(
    `
      update drivers
      set
        is_online = $2,
        return_trip_available = $3
      where user_id = $1
    `,
    [userId, nextIsOnline, nextReturnTrip]
  );

  return getDriverDashboard(userId);
}

async function updateDriverLocation({ bookingId, latitude, longitude, userId }) {
  const pool = db.getPool();

  if (!pool || !userId) {
    throw new Error('Database is required for driver location updates.');
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw buildStatusError('Valid latitude and longitude are required.', 400);
  }

  const result = await db.query(
    `
      select
        b.id as booking_id,
        at.id as active_trip_id,
        driver_user.id as driver_user_id
      from bookings b
      join active_trips at on at.id = b.active_trip_id
      join drivers d on d.id = at.driver_id
      join users driver_user on driver_user.id = d.user_id
      where driver_user.id = $1
        and b.booking_status not in ('completed', 'cancelled')
        ${bookingId ? 'and b.id = $2' : ''}
      order by b.created_at desc
      limit 1
    `,
    bookingId ? [userId, bookingId] : [userId]
  );

  const tripRow = result.rows[0];

  if (!tripRow) {
    throw buildStatusError('No active driver trip is available to update.', 404);
  }

  await db.query(
    `
      update active_trips
      set
        current_lat = $2,
        current_lng = $3,
        last_location_at = now()
      where id = $1
    `,
    [tripRow.active_trip_id, lat, lng]
  );

  return getBookingById(tripRow.booking_id, {
    userId,
    userRole: 'driver',
  });
}

async function acceptIncomingRequest({ requestId, userId }) {
  const pool = db.getPool();

  if (!pool || !userId) {
    throw new Error('Database is required for driver dispatch.');
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const driverResult = await client.query(
      `
        select
          d.id,
          d.full_name,
          d.is_online
        from drivers d
        where d.user_id = $1
        limit 1
      `,
      [userId]
    );

    const driver = driverResult.rows[0];

    if (!driver) {
      throw buildStatusError('Driver profile not found.', 404);
    }

    if (!driver.is_online) {
      throw new Error('Go online before accepting rider requests.');
    }

    const requestResult = await client.query(
      `
        select
          rr.id,
          rr.corridor_id,
          rr.pickup_label,
          rr.dropoff_label,
          rr.origin_km,
          rr.destination_km,
          rr.ride_type,
          rr.seats_required,
          rr.allow_mid_trip_pickup,
          rr.route_geometry,
          rr.status
        from ride_requests rr
        where rr.id = $1
        limit 1
      `,
      [requestId]
    );

    const request = requestResult.rows[0];

    if (!request) {
      throw buildStatusError('Ride request not found.', 404);
    }

    if (request.status !== 'searching') {
      const existingBooking = await client.query(
        `
          select id
          from bookings
          where ride_request_id = $1
          order by created_at desc
          limit 1
        `,
        [request.id]
      );

      if (existingBooking.rows[0]?.id) {
        await client.query('commit');
        return getBookingById(existingBooking.rows[0].id, {
          userId,
          userRole: 'driver',
        });
      }

      throw new Error('This rider request has already been assigned.');
    }

    const tripResult = await client.query(
      `
        select
          at.id,
          at.base_solo_fare,
          at.available_seats,
          at.origin_label,
          at.destination_label,
          at.origin_km,
          at.destination_km,
          at.route_geometry,
          v.eta_minutes as vehicle_eta_minutes
        from active_trips at
        join vehicles v on v.id = at.vehicle_id
        where at.driver_id = $1
          and at.corridor_id = $2
          and at.status in ('open', 'in_progress')
          and at.available_seats >= $3
        order by at.departure_window_start asc
      `,
      [driver.id, request.corridor_id, request.seats_required]
    );

    const bestCandidate = tripResult.rows
      .map((trip) => ({
        overlap: overlapScore(request, trip),
        trip,
      }))
      .filter((candidate) => candidate.overlap.overlapRatio >= 0.35)
      .sort((left, right) => right.overlap.score - left.overlap.score)[0];

    if (!bestCandidate) {
      throw new Error('No compatible driver trip is available for this request right now.');
    }

    const reservation = await client.query(
      `
        update active_trips
        set
          available_seats = greatest(available_seats - $2, 0),
          status = case when available_seats - $2 <= 0 then 'full' else 'in_progress' end
        where id = $1
          and available_seats >= $2
        returning id
      `,
      [bestCandidate.trip.id, request.seats_required]
    );

    if (reservation.rows.length === 0) {
      throw new Error('That driver trip no longer has enough seats available.');
    }

    const fare = estimateDispatchFare(request, bestCandidate.trip, bestCandidate.overlap);
    const existingBooking = await client.query(
      `
        select id
        from bookings
        where ride_request_id = $1
        order by created_at desc
        limit 1
      `,
      [request.id]
    );

    let bookingId = existingBooking.rows[0]?.id || null;

    if (!bookingId) {
      const bookingInsert = await client.query(
        `
          insert into bookings (
            ride_request_id,
            active_trip_id,
            quoted_total,
            shared_savings,
            payment_method,
            booking_status
          )
          values ($1, $2, $3, $4, 'dispatch', 'confirmed')
          returning id
        `,
        [request.id, bestCandidate.trip.id, fare.estimatedFare, fare.estimatedSavings]
      );

      bookingId = bookingInsert.rows[0].id;
    }

    await client.query(
      `
        update ride_requests
        set status = 'booked'
        where id = $1
      `,
      [request.id]
    );

    await client.query('commit');
    return getBookingById(bookingId, {
      userId,
      userRole: 'driver',
    });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  acceptIncomingRequest,
  getDriverDashboard,
  updateDriverAvailability,
  updateDriverLocation,
};
