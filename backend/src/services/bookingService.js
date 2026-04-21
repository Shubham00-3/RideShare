const db = require('../config/db');
const { emitBookingEvent } = require('./realtimeService');
const {
  clamp,
  getLineDistanceKm,
  getPointAtLineProgress,
  getRouteProgressFromLocation,
  toNumber,
} = require('./routeMath');

const BOOKING_SELECT_COLUMNS = `
  b.id as booking_id,
  b.booking_status,
  b.quoted_total,
  b.shared_savings,
  b.payment_method,
  b.created_at as booking_created_at,
  rr.id as ride_request_id,
  rr.rider_id,
  rr.pickup_label,
  rr.dropoff_label,
  rr.pickup_lat,
  rr.pickup_lng,
  rr.dropoff_lat,
  rr.dropoff_lng,
  rr.ride_type,
  rr.allow_mid_trip_pickup,
  rr.departure_time,
  rr.origin_km,
  rr.destination_km,
  rr.route_distance_meters,
  rr.route_duration_seconds,
  rr.route_geometry,
  rr.seats_required,
  rr.created_at as request_created_at,
  at.id as active_trip_id,
  at.status as active_trip_status,
  at.allow_mid_trip_join,
  at.route_geometry as active_route_geometry,
  at.route_distance_meters as active_route_distance_meters,
  at.route_duration_seconds as active_route_duration_seconds,
  at.current_lat,
  at.current_lng,
  at.last_location_at,
  at.started_at as trip_started_at,
  at.completed_at as trip_completed_at,
  v.display_name as vehicle_name,
  v.vehicle_type,
  v.eta_minutes as vehicle_eta_minutes,
  d.full_name as driver_name,
  d.rating as driver_rating,
  d.trip_count as driver_trip_count,
  driver_user.id as driver_user_id,
  driver_user.phone as driver_phone,
  rider_user.full_name as rider_name,
  rider_user.phone as rider_phone,
  tr.score as rider_rating_score,
  tr.comment as rider_rating_comment,
  tr.created_at as rider_rating_created_at
`;

const BOOKING_JOINS = `
  from bookings b
  left join ride_requests rr on rr.id = b.ride_request_id
  left join active_trips at on at.id = b.active_trip_id
  left join vehicles v on v.id = at.vehicle_id
  left join drivers d on d.id = at.driver_id
  left join users driver_user on driver_user.id = d.user_id
  left join users rider_user on rider_user.id = rr.rider_id
  left join trip_ratings tr on tr.booking_id = b.id and tr.rater_user_id = rr.rider_id
`;

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function estimateDurationMinutes(distanceKm) {
  return Math.max(Math.round(toNumber(distanceKm) * 2.3), 15);
}

function parseLocation(label, latitude, longitude) {
  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    label,
    coordinates: {
      latitude: toNumber(latitude),
      longitude: toNumber(longitude),
    },
  };
}

function parseCurrentLocation(row, routeGeometry, progressHint) {
  if (row.current_lat != null && row.current_lng != null) {
    return {
      label: row.driver_name ? `${row.driver_name} live location` : 'Driver live location',
      coordinates: {
        latitude: toNumber(row.current_lat),
        longitude: toNumber(row.current_lng),
      },
      lastUpdatedAt: row.last_location_at || null,
    };
  }

  if (!routeGeometry) {
    return null;
  }

  const fallbackPoint = getPointAtLineProgress(routeGeometry, progressHint);

  if (!fallbackPoint) {
    return null;
  }

  return {
    label: row.driver_name ? `${row.driver_name} route` : 'Driver route',
    coordinates: fallbackPoint,
    lastUpdatedAt: row.last_location_at || null,
  };
}

function buildLiveTripState(row) {
  const routeGeometry = row.active_route_geometry || row.route_geometry || null;
  const pickupLabel = row.pickup_label || 'Pickup';
  const dropoffLabel = row.dropoff_label || 'Dropoff';
  const fallbackDistanceKm = Math.max(
    Number((toNumber(row.destination_km) - toNumber(row.origin_km)).toFixed(1)),
    0
  );
  const routeDistanceKm =
    toNumber(row.active_route_distance_meters || row.route_distance_meters) > 0
      ? toNumber(row.active_route_distance_meters || row.route_distance_meters) / 1000
      : getLineDistanceKm(routeGeometry) || fallbackDistanceKm;
  const routeDurationMinutes =
    toNumber(row.active_route_duration_seconds || row.route_duration_seconds) > 0
      ? Math.max(
          Math.round(toNumber(row.active_route_duration_seconds || row.route_duration_seconds) / 60),
          1
        )
      : estimateDurationMinutes(routeDistanceKm || fallbackDistanceKm);
  const allowMidTripPickup = row.allow_mid_trip_pickup ?? row.allow_mid_trip_join ?? true;
  const bookingStatus = String(row.booking_status || 'confirmed').trim().toLowerCase();
  const scheduledDeparture = row.departure_time ? new Date(row.departure_time) : null;
  const startedAt = row.trip_started_at ? new Date(row.trip_started_at) : null;
  const completedAt = row.trip_completed_at ? new Date(row.trip_completed_at) : null;
  const now = new Date();
  const minutesUntilDeparture = scheduledDeparture
    ? Math.max(Math.ceil((scheduledDeparture.getTime() - now.getTime()) / 60000), 0)
    : 0;
  const isScheduled = bookingStatus === 'confirmed' && minutesUntilDeparture > 0;
  const persistedLocation =
    row.current_lat != null && row.current_lng != null
      ? {
          latitude: toNumber(row.current_lat),
          longitude: toNumber(row.current_lng),
        }
      : null;
  const routeProgressMatch =
    routeGeometry && persistedLocation
      ? getRouteProgressFromLocation(routeGeometry, persistedLocation)
      : null;

  let progress = 0;

  if (bookingStatus === 'completed' || completedAt) {
    progress = 1;
  } else if (routeProgressMatch) {
    progress = routeProgressMatch.progress;
  } else if (startedAt && ['on_trip', 'arriving_soon'].includes(bookingStatus)) {
    progress = clamp(
      (now.getTime() - startedAt.getTime()) / (routeDurationMinutes * 60 * 1000),
      0,
      0.98
    );
  } else if (bookingStatus === 'arriving_soon') {
    progress = 0.84;
  } else if (bookingStatus === 'on_trip') {
    progress = 0.32;
  }

  let tripStatus = isScheduled ? 'scheduled' : 'driver_arriving';
  let phaseLabel = isScheduled ? 'Ride scheduled' : 'Driver arriving';
  let nextStopLabel = isScheduled ? 'Scheduled pickup' : 'Pickup point';

  if (bookingStatus === 'cancelled') {
    tripStatus = 'cancelled';
    phaseLabel = 'Trip cancelled';
    nextStopLabel = 'Cancelled';
  } else if (bookingStatus === 'completed' || completedAt) {
    tripStatus = 'completed';
    phaseLabel = 'Trip completed';
    nextStopLabel = 'Dropoff reached';
    progress = 1;
  } else if (bookingStatus === 'arriving_soon') {
    tripStatus = 'arriving_soon';
    phaseLabel = 'Arriving soon';
    nextStopLabel = 'Dropoff point';
  } else if (bookingStatus === 'on_trip') {
    tripStatus = progress >= 0.82 ? 'arriving_soon' : 'on_trip';
    phaseLabel = tripStatus === 'arriving_soon' ? 'Arriving soon' : 'Ride in progress';
    nextStopLabel = 'Dropoff point';
  }

  const remainingDistanceKm =
    tripStatus === 'scheduled' || tripStatus === 'driver_arriving'
      ? Number(routeDistanceKm.toFixed(1))
      : tripStatus === 'completed' || tripStatus === 'cancelled'
        ? 0
        : Number((routeDistanceKm * (1 - progress)).toFixed(1));
  const remainingMinutes =
    tripStatus === 'scheduled'
      ? minutesUntilDeparture
      : tripStatus === 'driver_arriving'
        ? Math.max(Math.round(toNumber(row.vehicle_eta_minutes || 4)), 1)
        : tripStatus === 'completed' || tripStatus === 'cancelled'
          ? 0
          : Math.max(Math.round(routeDurationMinutes * (1 - progress)), 1);
  const driverEtaMinutes =
    tripStatus === 'driver_arriving' ? Math.max(Math.round(toNumber(row.vehicle_eta_minutes || 4)), 1) : 0;
  const effectiveStart =
    startedAt ||
    (tripStatus === 'scheduled'
      ? scheduledDeparture
      : new Date(now.getTime() - progress * routeDurationMinutes * 60 * 1000));
  const estimatedCompletionAt =
    tripStatus === 'completed' && completedAt
      ? completedAt.toISOString()
      : effectiveStart
        ? new Date(effectiveStart.getTime() + routeDurationMinutes * 60 * 1000).toISOString()
        : new Date(now.getTime() + remainingMinutes * 60 * 1000).toISOString();
  const currentLocation = parseCurrentLocation(
    row,
    routeGeometry,
    tripStatus === 'driver_arriving' ? 0.04 : progress
  );
  const midTripOffer =
    allowMidTripPickup && tripStatus === 'on_trip' && progress >= 0.25 && progress <= 0.68
      ? {
          title: 'Another rider can join nearby',
          discount: 40,
        }
      : null;

  return {
    currentLocation,
    distanceKm: Number(routeDistanceKm.toFixed(1)),
    driverEtaMinutes,
    durationMinutes: routeDurationMinutes,
    estimatedCompletionAt,
    lastUpdatedAt: row.last_location_at || now.toISOString(),
    liveTimelineMinutes: routeDurationMinutes,
    midTripOffer,
    nextStopLabel,
    phaseLabel,
    progress: Number(progress.toFixed(2)),
    remainingDistanceKm,
    remainingMinutes,
    routeGeometry,
    routeDistanceMeters: Math.round(routeDistanceKm * 1000),
    routeDurationSeconds: routeDurationMinutes * 60,
    status: tripStatus,
  };
}

function normalizeBookingRow(row) {
  if (!row) {
    return null;
  }

  const pickupLabel = row.pickup_label || 'Pickup';
  const dropoffLabel = row.dropoff_label || 'Dropoff';
  const driverName = row.driver_name || 'Assigned driver';
  const vehicleName = row.vehicle_name || 'Assigned vehicle';
  const vehicleType = row.vehicle_type || 'Shared ride';
  const liveTripState = buildLiveTripState(row);
  const bookingStatus =
    row.booking_status === 'confirmed' && liveTripState.status === 'completed'
      ? 'completed'
      : row.booking_status || 'confirmed';

  return {
    bookingId: row.booking_id,
    createdAt: row.booking_created_at || row.request_created_at || null,
    paymentMethod: row.payment_method,
    source: 'api',
    status: bookingStatus,
    rider:
      row.rider_name || row.rider_phone
        ? {
            name: row.rider_name || 'Assigned rider',
            phone: row.rider_phone || null,
          }
        : null,
    trip: {
      id: row.active_trip_id || `trip_booking_${row.booking_id}`,
      status: liveTripState.status,
      pickup: pickupLabel,
      dropoff: dropoffLabel,
      pickupLocation: parseLocation(pickupLabel, row.pickup_lat, row.pickup_lng),
      dropoffLocation: parseLocation(dropoffLabel, row.dropoff_lat, row.dropoff_lng),
      currentLocation: liveTripState.currentLocation,
      routeLabel: `${pickupLabel.split(',')[0]} -> ${dropoffLabel.split(',')[0]}`,
      rideType: row.ride_type || 'shared',
      departureTime: row.departure_time || null,
      allowMidTripPickup: row.allow_mid_trip_pickup ?? row.allow_mid_trip_join ?? true,
      etaMinutes: liveTripState.remainingMinutes,
      driverEtaMinutes: liveTripState.driverEtaMinutes,
      durationMinutes: liveTripState.durationMinutes,
      distanceKm: liveTripState.distanceKm,
      routeGeometry: liveTripState.routeGeometry,
      routeDurationSeconds: liveTripState.routeDurationSeconds,
      routeDistanceMeters: liveTripState.routeDistanceMeters,
      estimatedCompletionAt: liveTripState.estimatedCompletionAt,
      fareTotal: Math.round(toNumber(row.quoted_total)),
      fareSavings: Math.round(toNumber(row.shared_savings)),
      lastUpdatedAt: liveTripState.lastUpdatedAt,
      liveTimelineMinutes: liveTripState.liveTimelineMinutes,
      nextStopLabel: liveTripState.nextStopLabel,
      phaseLabel: liveTripState.phaseLabel,
      progress: liveTripState.progress,
      remainingDistanceKm: liveTripState.remainingDistanceKm,
      vehicle: {
        name: vehicleName,
        type: vehicleType,
        color: 'White',
        plateNumber: 'DL 01 AB 1234',
      },
      driver: {
        name: driverName,
        rating: toNumber(row.driver_rating || 4.9),
        trips: toNumber(row.driver_trip_count || 1000),
        phone: row.driver_phone || '+91 99999 11111',
      },
      midTripOffer: liveTripState.midTripOffer,
      rating:
        row.rider_rating_score != null
          ? {
              comment: row.rider_rating_comment || '',
              createdAt: row.rider_rating_created_at || null,
              score: toNumber(row.rider_rating_score),
            }
          : null,
    },
  };
}

function assertBookingViewerAccess(row, viewer = {}) {
  const { userId = null, userRole = null } = viewer;

  if (!userId) {
    return;
  }

  if (row.rider_id === userId || row.driver_user_id === userId || userRole === 'admin') {
    return;
  }

  throw buildStatusError('You do not have access to this booking.', 403);
}

async function fetchBookingRow(whereClause, params = []) {
  const result = await db.query(
    `
      select
        ${BOOKING_SELECT_COLUMNS}
      ${BOOKING_JOINS}
      ${whereClause}
      limit 1
    `,
    params
  );

  return result.rows[0] || null;
}

async function fetchActiveTripSnapshot(client, tripId) {
  if (!tripId) {
    return null;
  }

  const result = await client.query(
    `
      select
        t.id,
        t.available_seats,
        t.allow_mid_trip_join,
        t.route_geometry,
        t.route_distance_meters,
        t.route_duration_seconds,
        t.current_lat,
        t.current_lng
      from active_trips t
      where t.id = $1
      limit 1
    `,
    [tripId]
  );

  return result.rows[0] || null;
}

async function ensureRideRequestOwnership(client, rideRequestId, userId) {
  const rideRequestResult = await client.query(
    `
      select
        id,
        rider_id,
        status
      from ride_requests
      where id = $1
      limit 1
    `,
    [rideRequestId]
  );

  const rideRequest = rideRequestResult.rows[0];

  if (!rideRequest) {
    throw buildStatusError('Ride request not found.', 404);
  }

  if (rideRequest.rider_id && rideRequest.rider_id !== userId) {
    throw buildStatusError('You can only book your own ride requests.', 403);
  }

  if (!rideRequest.rider_id) {
    await client.query(
      `
        update ride_requests
        set rider_id = $2
        where id = $1
      `,
      [rideRequestId, userId]
    );
  }

  return rideRequest;
}

async function initializeTripLocation(client, tripId, routeGeometry) {
  const startPoint = getPointAtLineProgress(routeGeometry, 0);

  if (!tripId || !startPoint) {
    return;
  }

  await client.query(
    `
      update active_trips
      set
        current_lat = coalesce(current_lat, $2),
        current_lng = coalesce(current_lng, $3),
        last_location_at = coalesce(last_location_at, now())
      where id = $1
    `,
    [tripId, startPoint.latitude, startPoint.longitude]
  );
}

async function getBookingById(bookingId, viewer = {}) {
  const pool = db.getPool();

  if (!pool) {
    return null;
  }

  const row = await fetchBookingRow('where b.id = $1', [bookingId]);

  if (!row) {
    return null;
  }

  assertBookingViewerAccess(row, viewer);
  return normalizeBookingRow(row);
}

async function getBookingsForUser(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return [];
  }

  const result = await db.query(
    `
      select
        ${BOOKING_SELECT_COLUMNS}
      ${BOOKING_JOINS}
      where rr.rider_id = $1
      order by b.created_at desc
    `,
    [userId]
  );

  return result.rows.map(normalizeBookingRow);
}

async function getDriverBookings(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return {
      items: [],
      summary: {
        activeTrips: 0,
        completedTrips: 0,
        earningsToday: 0,
      },
    };
  }

  const result = await db.query(
    `
      select
        ${BOOKING_SELECT_COLUMNS}
      ${BOOKING_JOINS}
      where driver_user.id = $1
      order by
        case when b.booking_status in ('completed', 'cancelled') then 1 else 0 end,
        b.created_at desc
    `,
    [userId]
  );

  const items = result.rows.map(normalizeBookingRow);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const summary = items.reduce(
    (accumulator, item) => {
      if (item.status === 'completed') {
        accumulator.completedTrips += 1;
      } else if (item.status !== 'cancelled') {
        accumulator.activeTrips += 1;
      }

      if (item.createdAt && new Date(item.createdAt) >= startOfToday) {
        accumulator.earningsToday += Number(item.trip?.fareTotal || 0);
      }

      return accumulator;
    },
    {
      activeTrips: 0,
      completedTrips: 0,
      earningsToday: 0,
    }
  );

  return {
    items,
    summary,
  };
}

async function updateDriverBookingStatus({ bookingId, status, userId }) {
  const pool = db.getPool();
  const nextStatus = String(status || '').trim().toLowerCase();
  const allowedStatuses = ['confirmed', 'on_trip', 'arriving_soon', 'completed', 'cancelled'];

  if (!pool) {
    throw new Error('Database is required for driver controls.');
  }

  if (!userId) {
    throw new Error('Authentication is required.');
  }

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error('Unsupported driver trip status.');
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const bookingResult = await client.query(
      `
        select
          b.id as booking_id,
          b.active_trip_id,
          b.ride_request_id,
          at.route_geometry,
          d.user_id as driver_user_id
        from bookings b
        join active_trips at on at.id = b.active_trip_id
        join drivers d on d.id = at.driver_id
        where b.id = $1
        limit 1
      `,
      [bookingId]
    );

    const bookingRow = bookingResult.rows[0];

    if (!bookingRow) {
      throw buildStatusError('Driver booking not found.', 404);
    }

    if (bookingRow.driver_user_id !== userId) {
      throw buildStatusError('You can only update your own driver trips.', 403);
    }

    await client.query(
      `
        update bookings
        set booking_status = $2
        where id = $1
      `,
      [bookingId, nextStatus]
    );

    if (bookingRow.ride_request_id) {
      const rideRequestStatus =
        nextStatus === 'completed'
          ? 'completed'
          : nextStatus === 'cancelled'
            ? 'cancelled'
            : 'booked';

      await client.query(
        `
          update ride_requests
          set status = $2
          where id = $1
        `,
        [bookingRow.ride_request_id, rideRequestStatus]
      );
    }

    if (bookingRow.active_trip_id) {
      const tripStatus =
        nextStatus === 'completed'
          ? 'completed'
          : nextStatus === 'cancelled'
            ? 'cancelled'
            : nextStatus === 'confirmed'
              ? 'open'
              : 'in_progress';
      const startPoint =
        nextStatus === 'confirmed' || nextStatus === 'on_trip'
          ? getPointAtLineProgress(bookingRow.route_geometry, nextStatus === 'confirmed' ? 0 : 0.08)
          : null;

      await client.query(
        `
          update active_trips
          set
            status = $2,
            started_at = case
              when $2 in ('in_progress') then coalesce(started_at, now())
              else started_at
            end,
            completed_at = case
              when $2 in ('completed', 'cancelled') then now()
              else completed_at
            end,
            current_lat = case
              when current_lat is null and $3::numeric is not null then $3::numeric
              else current_lat
            end,
            current_lng = case
              when current_lng is null and $4::numeric is not null then $4::numeric
              else current_lng
            end,
            last_location_at = case
              when current_lat is null and $3::numeric is not null then now()
              else last_location_at
            end
          where id = $1
        `,
        [
          bookingRow.active_trip_id,
          tripStatus,
          startPoint?.latitude ?? null,
          startPoint?.longitude ?? null,
        ]
      );
    }

    await client.query('commit');
    const booking = await getBookingById(bookingId);
    await emitBookingEvent(`driver_status_${nextStatus}`, bookingId);
    return booking;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelBookingForUser({ bookingId, userId }) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for rider cancellation.');
  }

  if (!userId) {
    throw new Error('Authentication is required.');
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const bookingResult = await client.query(
      `
        select
          b.id as booking_id,
          b.booking_status,
          b.active_trip_id,
          b.ride_request_id,
          rr.rider_id,
          rr.seats_required
        from bookings b
        join ride_requests rr on rr.id = b.ride_request_id
        where b.id = $1
        limit 1
      `,
      [bookingId]
    );

    const bookingRow = bookingResult.rows[0];

    if (!bookingRow) {
      throw buildStatusError('Booking not found.', 404);
    }

    if (bookingRow.rider_id !== userId) {
      throw buildStatusError('You can only cancel your own bookings.', 403);
    }

    if (['completed', 'cancelled'].includes(String(bookingRow.booking_status || '').toLowerCase())) {
      await client.query('commit');
      return getBookingById(bookingId, {
        userId,
      });
    }

    await client.query(
      `
        update bookings
        set booking_status = 'cancelled'
        where id = $1
      `,
      [bookingId]
    );

    if (bookingRow.ride_request_id) {
      await client.query(
        `
          update ride_requests
          set status = 'cancelled'
          where id = $1
        `,
        [bookingRow.ride_request_id]
      );
    }

    if (bookingRow.active_trip_id) {
      await client.query(
        `
          update active_trips
          set
            available_seats = available_seats + $2,
            status = case
              when status in ('completed', 'cancelled') then status
              else 'open'
            end,
            completed_at = case
              when status = 'cancelled' then now()
              else completed_at
            end
          where id = $1
        `,
        [bookingRow.active_trip_id, Math.max(Number(bookingRow.seats_required || 1), 1)]
      );
    }

    await client.query('commit');
    const booking = await getBookingById(bookingId, {
      userId,
    });
    await emitBookingEvent('booking_cancelled', bookingId);
    return booking;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function calculateQuote({ request, match, vehicle, options = {} }) {
  const insurance = options.insurance ?? true;
  const allowMidTripPickup = options.allowMidTripPickup ?? true;
  const baseFare = Math.max(request.distanceKm * 8, 100);
  const distanceFare = Math.max((vehicle.fareValue || 0) * 0.64, 120);
  const platformFee = 20;
  const insuranceFee = insurance ? 15 : 0;
  const poolingDiscount = Math.max((match.savingsValue || 80) * 0.2, 35);
  const midTripPickupDiscount = allowMidTripPickup ? 18 : 0;
  const total =
    Math.round(baseFare) +
    Math.round(distanceFare) +
    platformFee +
    insuranceFee -
    Math.round(poolingDiscount) -
    midTripPickupDiscount;

  return {
    requestId: request.id,
    matchId: match.id,
    vehicleId: vehicle.providerVehicleId,
    breakdown: {
      baseFare: Math.round(baseFare),
      distanceFare: Math.round(distanceFare),
      platformFee,
      poolingDiscount: Math.round(poolingDiscount),
      midTripPickupDiscount,
      insuranceFee,
    },
    totals: {
      total,
      soloReferenceFare: match.soloFareValue,
      estimatedSavings: Math.max(match.soloFareValue - total, 0),
    },
  };
}

async function confirmBooking({ request, match, quote, options = {}, userId }) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for booking confirmation.');
  }

  if (!userId) {
    throw buildStatusError('Authentication is required.', 401);
  }

  const rideRequestId = isUuid(request?.id) ? request.id : null;

  if (!rideRequestId) {
    throw buildStatusError('A persisted ride request is required before booking.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const rideRequest = await ensureRideRequestOwnership(client, rideRequestId, userId);
    const existingBooking = await client.query(
      `
        select id
        from bookings
        where ride_request_id = $1
        order by created_at desc
        limit 1
      `,
      [rideRequestId]
    );

    if (existingBooking.rows[0]?.id) {
      await client.query('commit');
      return getBookingById(existingBooking.rows[0].id, {
        userId,
      });
    }

    const activeTrip = await fetchActiveTripSnapshot(client, match?.id);
    const seatsRequired = Math.max(Number(request?.seatsRequired || rideRequest.seats_required || 1), 1);

    if (activeTrip) {
      const seatReservation = await client.query(
        `
          update active_trips
          set
            available_seats = greatest(available_seats - $2, 0),
            status = case when available_seats - $2 <= 0 then 'full' else status end
          where id = $1
            and available_seats >= $2
          returning id
        `,
        [activeTrip.id, seatsRequired]
      );

      if (seatReservation.rows.length === 0) {
        throw buildStatusError('Selected trip no longer has enough seats available.', 409);
      }
    }

    const activeTripId = activeTrip?.id || null;
    const paymentMethod = String(options.paymentMethod || 'upi');
    const insertBooking = await client.query(
      `
        insert into bookings (
          ride_request_id,
          active_trip_id,
          quoted_total,
          shared_savings,
          payment_method,
          booking_status
        )
        values ($1, $2, $3, $4, $5, 'confirmed')
        returning id
      `,
      [
        rideRequestId,
        activeTripId,
        quote.totals.total,
        quote.totals.estimatedSavings,
        paymentMethod,
      ]
    );

    await client.query(
      `
        update ride_requests
        set status = 'booked'
        where id = $1
      `,
      [rideRequestId]
    );

    if (activeTripId) {
      await initializeTripLocation(client, activeTripId, activeTrip.route_geometry);
    }

    await client.query('commit');
    const booking = await getBookingById(insertBooking.rows[0].id, {
      userId,
    });
    await emitBookingEvent('booking_confirmed', insertBooking.rows[0].id);
    return booking;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function rescheduleBooking({ bookingId, departureTime, userId }) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for booking reschedules.');
  }

  const nextDeparture = new Date(departureTime);

  if (Number.isNaN(nextDeparture.getTime()) || nextDeparture.getTime() <= Date.now()) {
    throw buildStatusError('A future departure time is required.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const result = await client.query(
      `
        select
          b.id as booking_id,
          b.booking_status,
          rr.id as ride_request_id,
          rr.rider_id
        from bookings b
        join ride_requests rr on rr.id = b.ride_request_id
        where b.id = $1
        limit 1
      `,
      [bookingId]
    );

    const row = result.rows[0];

    if (!row) {
      throw buildStatusError('Booking not found.', 404);
    }

    if (row.rider_id !== userId) {
      throw buildStatusError('You can only reschedule your own bookings.', 403);
    }

    if (['completed', 'cancelled'].includes(String(row.booking_status || '').toLowerCase())) {
      throw buildStatusError('Completed or cancelled bookings cannot be rescheduled.', 409);
    }

    await client.query(
      `
        update ride_requests
        set departure_time = $2
        where id = $1
      `,
      [row.ride_request_id, nextDeparture.toISOString()]
    );

    await client.query('commit');
    const booking = await getBookingById(bookingId, {
      userId,
    });
    await emitBookingEvent('booking_rescheduled', bookingId);
    return booking;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function submitBookingRating({ bookingId, comment, score, userId }) {
  const pool = db.getPool();
  const normalizedScore = Math.round(Number(score));

  if (!pool) {
    throw new Error('Database is required for ratings.');
  }

  if (!Number.isFinite(normalizedScore) || normalizedScore < 1 || normalizedScore > 5) {
    throw buildStatusError('Ratings must be between 1 and 5.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const bookingResult = await client.query(
      `
        select
          b.id as booking_id,
          b.booking_status,
          rr.rider_id,
          driver_user.id as driver_user_id
        from bookings b
        join ride_requests rr on rr.id = b.ride_request_id
        left join active_trips at on at.id = b.active_trip_id
        left join drivers d on d.id = at.driver_id
        left join users driver_user on driver_user.id = d.user_id
        where b.id = $1
        limit 1
      `,
      [bookingId]
    );

    const bookingRow = bookingResult.rows[0];

    if (!bookingRow) {
      throw buildStatusError('Booking not found.', 404);
    }

    if (bookingRow.rider_id !== userId) {
      throw buildStatusError('Only the rider who owns the booking can leave a rating.', 403);
    }

    if (String(bookingRow.booking_status || '').toLowerCase() !== 'completed') {
      throw buildStatusError('Ratings can only be submitted after a trip is completed.', 409);
    }

    if (!bookingRow.driver_user_id) {
      throw buildStatusError('This booking does not have an assigned driver to rate.', 409);
    }

    await client.query(
      `
        insert into trip_ratings (
          booking_id,
          rater_user_id,
          subject_user_id,
          score,
          comment
        )
        values ($1, $2, $3, $4, $5)
        on conflict (booking_id, rater_user_id) do update
          set
            score = excluded.score,
            comment = excluded.comment,
            updated_at = now()
      `,
      [bookingId, userId, bookingRow.driver_user_id, normalizedScore, String(comment || '').trim() || null]
    );

    await client.query(
      `
        update users
        set rating = ratings.average_score
        from (
          select
            subject_user_id,
            avg(score)::numeric(3,2) as average_score
          from trip_ratings
          where subject_user_id = $1
          group by subject_user_id
        ) ratings
        where users.id = ratings.subject_user_id
      `,
      [bookingRow.driver_user_id]
    );

    await client.query(
      `
        update drivers
        set rating = users.rating
        from users
        where drivers.user_id = users.id
          and drivers.user_id = $1
      `,
      [bookingRow.driver_user_id]
    );

    await client.query('commit');
    const booking = await getBookingById(bookingId, {
      userId,
    });
    await emitBookingEvent('booking_rated', bookingId);
    return booking;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function getRatingsForUser(userId) {
  const [givenResult, receivedResult] = await Promise.all([
    db.query(
      `
        select
          tr.*,
          subject.full_name as subject_name
        from trip_ratings tr
        join users subject on subject.id = tr.subject_user_id
        where tr.rater_user_id = $1
        order by tr.created_at desc
      `,
      [userId]
    ),
    db.query(
      `
        select
          tr.*,
          rater.full_name as rater_name
        from trip_ratings tr
        join users rater on rater.id = tr.rater_user_id
        where tr.subject_user_id = $1
        order by tr.created_at desc
      `,
      [userId]
    ),
  ]);

  return {
    given: givenResult.rows.map((row) => ({
      bookingId: row.booking_id,
      comment: row.comment || '',
      createdAt: row.created_at,
      id: row.id,
      score: toNumber(row.score),
      subjectName: row.subject_name,
    })),
    received: receivedResult.rows.map((row) => ({
      bookingId: row.booking_id,
      comment: row.comment || '',
      createdAt: row.created_at,
      id: row.id,
      raterName: row.rater_name,
      score: toNumber(row.score),
    })),
  };
}

async function adminUpdateBooking({ bookingId, status }) {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!['confirmed', 'completed', 'cancelled'].includes(normalizedStatus)) {
    throw buildStatusError('Unsupported admin booking status.', 400);
  }

  const result = await db.query(
    `
      update bookings
      set booking_status = $2
      where id = $1
      returning id
    `,
    [bookingId, normalizedStatus]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Booking not found.', 404);
  }

  await emitBookingEvent('admin_booking_updated', bookingId);
  return getBookingById(bookingId);
}

module.exports = {
  adminUpdateBooking,
  cancelBookingForUser,
  calculateQuote,
  confirmBooking,
  getBookingById,
  getBookingsForUser,
  getDriverBookings,
  getRatingsForUser,
  rescheduleBooking,
  submitBookingRating,
  updateDriverBookingStatus,
};
