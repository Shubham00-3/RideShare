const db = require('../config/db');

function toNumber(value) {
  return Number(value || 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function estimateDurationMinutes(distanceKm) {
  return Math.max(Math.round(toNumber(distanceKm) * 2.3), 15);
}

function buildLiveTripState({
  allowMidTripPickup,
  bookingCreatedAt,
  bookingStatus,
  distanceKm,
  durationMinutes,
  vehicleEtaMinutes,
}) {
  const normalizedBookingStatus = String(bookingStatus || 'confirmed');
  const arrivalMinutes = clamp(Math.round(toNumber(vehicleEtaMinutes || 4)), 2, 8);
  const demoDriveMinutes = clamp(Math.round(durationMinutes * 0.35), 6, 18);
  const totalTimelineMinutes = arrivalMinutes + demoDriveMinutes;
  const createdAt = bookingCreatedAt ? new Date(bookingCreatedAt) : new Date();
  const now = new Date();
  const rawElapsedMinutes = Math.max((now.getTime() - createdAt.getTime()) / 60000, 0);
  const elapsedMinutes =
    normalizedBookingStatus === 'completed' ? totalTimelineMinutes : rawElapsedMinutes;
  const totalProgress = clamp(elapsedMinutes / totalTimelineMinutes, 0, 1);
  const isCompleted = normalizedBookingStatus === 'completed' || totalProgress >= 1;
  const rideElapsedMinutes = Math.max(elapsedMinutes - arrivalMinutes, 0);
  let rideProgress = clamp(rideElapsedMinutes / demoDriveMinutes, 0, 1);
  const remainingMinutes = isCompleted ? 0 : Math.max(Math.ceil(totalTimelineMinutes - elapsedMinutes), 1);

  if (normalizedBookingStatus === 'on_trip') {
    rideProgress = Math.max(rideProgress, 0.2);
  }

  if (normalizedBookingStatus === 'arriving_soon') {
    rideProgress = Math.max(rideProgress, 0.82);
  }

  let tripStatus = 'driver_arriving';
  let phaseLabel = 'Driver arriving';
  let nextStopLabel = 'Pickup point';

  if (normalizedBookingStatus === 'cancelled') {
    tripStatus = 'cancelled';
    phaseLabel = 'Trip cancelled';
    nextStopLabel = 'Cancelled';
  } else if (isCompleted) {
    tripStatus = 'completed';
    phaseLabel = 'Trip completed';
    nextStopLabel = 'Dropoff reached';
  } else if (normalizedBookingStatus === 'arriving_soon') {
    tripStatus = 'arriving_soon';
    phaseLabel = 'Arriving soon';
    nextStopLabel = 'Dropoff point';
  } else if (normalizedBookingStatus === 'on_trip') {
    tripStatus = 'on_trip';
    phaseLabel = 'Ride in progress';
    nextStopLabel = 'Dropoff point';
  } else if (elapsedMinutes < arrivalMinutes) {
    tripStatus = 'driver_arriving';
    phaseLabel = 'Driver arriving';
    nextStopLabel = 'Pickup point';
  } else if (rideProgress < 0.72) {
    tripStatus = 'on_trip';
    phaseLabel = 'Ride in progress';
    nextStopLabel = 'Dropoff point';
  } else {
    tripStatus = 'arriving_soon';
    phaseLabel = 'Arriving soon';
    nextStopLabel = 'Dropoff point';
  }

  const remainingDistanceKm =
    tripStatus === 'driver_arriving'
      ? distanceKm
      : tripStatus === 'completed'
        ? 0
        : Number((distanceKm * (1 - rideProgress)).toFixed(1));

  const midTripOffer =
    allowMidTripPickup && tripStatus === 'on_trip' && rideProgress >= 0.25 && rideProgress <= 0.68
      ? {
          title: 'Another rider can join nearby',
          discount: 40,
        }
      : null;

  return {
    driverEtaMinutes: tripStatus === 'driver_arriving' ? remainingMinutes : 0,
    estimatedCompletionAt: new Date(
      createdAt.getTime() + totalTimelineMinutes * 60 * 1000
    ).toISOString(),
    lastUpdatedAt: now.toISOString(),
    liveTimelineMinutes: totalTimelineMinutes,
    midTripOffer,
    nextStopLabel,
    phaseLabel,
    progress: Number(totalProgress.toFixed(2)),
    remainingDistanceKm,
    remainingMinutes,
    status: tripStatus,
  };
}

function normalizeBookingRow(row) {
  if (!row) {
    return null;
  }

  const pickupLabel = row.pickup_label || 'Pickup';
  const dropoffLabel = row.dropoff_label || 'Dropoff';
  const distanceKm = Math.max(
    Number((toNumber(row.destination_km) - toNumber(row.origin_km)).toFixed(1)),
    0
  );
  const allowMidTripPickup = row.allow_mid_trip_pickup ?? row.allow_mid_trip_join ?? true;
  const driverName = row.driver_name || 'Assigned driver';
  const vehicleName = row.vehicle_name || 'Assigned vehicle';
  const vehicleType = row.vehicle_type || 'Shared ride';
  const durationMinutes = estimateDurationMinutes(distanceKm);
  const liveTripState = buildLiveTripState({
    allowMidTripPickup,
    bookingCreatedAt: row.booking_created_at || row.created_at,
    bookingStatus: row.booking_status,
    distanceKm,
    durationMinutes,
    vehicleEtaMinutes: row.vehicle_eta_minutes,
  });
  const bookingStatus =
    row.booking_status === 'confirmed' && liveTripState.status === 'completed'
      ? 'completed'
      : row.booking_status || 'confirmed';

  return {
    bookingId: row.booking_id,
    createdAt: row.booking_created_at || row.created_at || null,
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
      pickupLocation:
        row.pickup_lat != null && row.pickup_lng != null
          ? {
              label: pickupLabel,
              coordinates: {
                latitude: toNumber(row.pickup_lat),
                longitude: toNumber(row.pickup_lng),
              },
            }
          : null,
      dropoffLocation:
        row.dropoff_lat != null && row.dropoff_lng != null
          ? {
              label: dropoffLabel,
              coordinates: {
                latitude: toNumber(row.dropoff_lat),
                longitude: toNumber(row.dropoff_lng),
              },
            }
          : null,
      routeLabel: `${pickupLabel.split(',')[0]} -> ${dropoffLabel.split(',')[0]}`,
      rideType: row.ride_type || 'shared',
      allowMidTripPickup,
      etaMinutes: liveTripState.remainingMinutes,
      driverEtaMinutes: liveTripState.driverEtaMinutes,
      durationMinutes,
      distanceKm,
      routeGeometry: row.route_geometry || null,
      routeDurationSeconds: toNumber(row.route_duration_seconds),
      routeDistanceMeters: toNumber(row.route_distance_meters),
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
    },
  };
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
        t.allow_mid_trip_join
      from active_trips t
      where t.id = $1
      limit 1
    `,
    [tripId]
  );

  return result.rows[0] || null;
}

async function getBookingById(bookingId) {
  const pool = db.getPool();

  if (!pool) {
    return null;
  }

  const result = await db.query(
    `
      select
        b.id as booking_id,
        b.booking_status,
        b.quoted_total,
        b.shared_savings,
        b.payment_method,
        b.created_at as booking_created_at,
        rr.id as ride_request_id,
        rr.pickup_label,
        rr.dropoff_label,
        rr.pickup_lat,
        rr.pickup_lng,
        rr.dropoff_lat,
        rr.dropoff_lng,
        rr.ride_type,
        rr.allow_mid_trip_pickup,
        rr.origin_km,
        rr.destination_km,
        rr.route_distance_meters,
        rr.route_duration_seconds,
        rr.route_geometry,
        at.id as active_trip_id,
        at.status as active_trip_status,
        at.allow_mid_trip_join,
        v.display_name as vehicle_name,
        v.vehicle_type,
        v.eta_minutes as vehicle_eta_minutes,
        d.full_name as driver_name,
        d.rating as driver_rating,
        d.trip_count as driver_trip_count,
        u.phone as driver_phone
      from bookings b
      left join ride_requests rr on rr.id = b.ride_request_id
      left join active_trips at on at.id = b.active_trip_id
      left join vehicles v on v.id = at.vehicle_id
      left join drivers d on d.id = at.driver_id
      left join users u on u.id = d.user_id
      where b.id = $1
      limit 1
    `,
    [bookingId]
  );

  return normalizeBookingRow(result.rows[0]);
}

async function getBookingsForUser(userId) {
  const pool = db.getPool();

  if (!pool || !userId) {
    return [];
  }

  const result = await db.query(
    `
      select
        b.id as booking_id,
        b.booking_status,
        b.quoted_total,
        b.shared_savings,
        b.payment_method,
        b.created_at as booking_created_at,
        rr.id as ride_request_id,
        rr.pickup_label,
        rr.dropoff_label,
        rr.pickup_lat,
        rr.pickup_lng,
        rr.dropoff_lat,
        rr.dropoff_lng,
        rr.ride_type,
        rr.allow_mid_trip_pickup,
        rr.origin_km,
        rr.destination_km,
        rr.route_distance_meters,
        rr.route_duration_seconds,
        rr.route_geometry,
        rr.created_at as request_created_at,
        at.id as active_trip_id,
        at.status as active_trip_status,
        at.allow_mid_trip_join,
        v.display_name as vehicle_name,
        v.vehicle_type,
        v.eta_minutes as vehicle_eta_minutes,
        d.full_name as driver_name,
        d.rating as driver_rating,
        d.trip_count as driver_trip_count,
        u.phone as driver_phone
      from bookings b
      join ride_requests rr on rr.id = b.ride_request_id
      left join active_trips at on at.id = b.active_trip_id
      left join vehicles v on v.id = at.vehicle_id
      left join drivers d on d.id = at.driver_id
      left join users u on u.id = d.user_id
      where rr.rider_id = $1
      order by b.created_at desc
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    ...normalizeBookingRow(row),
    createdAt: row.booking_created_at || row.request_created_at,
    paymentMethod: row.payment_method,
  }));
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
        b.id as booking_id,
        b.booking_status,
        b.quoted_total,
        b.shared_savings,
        b.payment_method,
        b.created_at as booking_created_at,
        rr.id as ride_request_id,
        rr.pickup_label,
        rr.dropoff_label,
        rr.pickup_lat,
        rr.pickup_lng,
        rr.dropoff_lat,
        rr.dropoff_lng,
        rr.ride_type,
        rr.allow_mid_trip_pickup,
        rr.origin_km,
        rr.destination_km,
        rr.route_distance_meters,
        rr.route_duration_seconds,
        rr.route_geometry,
        rr.created_at as request_created_at,
        at.id as active_trip_id,
        at.status as active_trip_status,
        at.allow_mid_trip_join,
        v.display_name as vehicle_name,
        v.vehicle_type,
        v.eta_minutes as vehicle_eta_minutes,
        d.full_name as driver_name,
        d.rating as driver_rating,
        d.trip_count as driver_trip_count,
        driver_user.phone as driver_phone,
        rider_user.full_name as rider_name,
        rider_user.phone as rider_phone
      from bookings b
      join active_trips at on at.id = b.active_trip_id
      join drivers d on d.id = at.driver_id
      join users driver_user on driver_user.id = d.user_id
      left join ride_requests rr on rr.id = b.ride_request_id
      left join vehicles v on v.id = at.vehicle_id
      left join users rider_user on rider_user.id = rr.rider_id
      where d.user_id = $1
      order by
        case when b.booking_status in ('completed', 'cancelled') then 1 else 0 end,
        b.created_at desc
    `,
    [userId]
  );

  const items = result.rows.map((row) => ({
    ...normalizeBookingRow(row),
    createdAt: row.booking_created_at || row.request_created_at,
    paymentMethod: row.payment_method,
  }));
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
      throw new Error('Driver booking not found.');
    }

    if (bookingRow.driver_user_id !== userId) {
      throw new Error('You can only update your own driver trips.');
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

      await client.query(
        `
          update active_trips
          set status = $2
          where id = $1
        `,
        [bookingRow.active_trip_id, tripStatus]
      );
    }

    await client.query('commit');
    return getBookingById(bookingId);
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
  const baseFare = Math.max(Math.round(request.distanceKm * 8), 100);
  const distanceFare = Math.max(Math.round((vehicle.fareValue || 0) * 0.64), 120);
  const platformFee = 20;
  const insuranceFee = insurance ? 15 : 0;
  const poolingDiscount = Math.max(Math.round((match.savingsValue || 80) * 0.2), 35);
  const midTripPickupDiscount = allowMidTripPickup ? 18 : 0;
  const total =
    baseFare +
    distanceFare +
    platformFee +
    insuranceFee -
    poolingDiscount -
    midTripPickupDiscount;

  return {
    requestId: request.id,
    matchId: match.id,
    vehicleId: vehicle.providerVehicleId,
    breakdown: {
      baseFare,
      distanceFare,
      platformFee,
      poolingDiscount,
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

function buildEphemeralBooking({ request, match, vehicle, quote, options = {} }) {
  const createdAt = Date.now();
  const etaMinutes =
    Number(String(vehicle.eta || '4').replace(/[^\d.]/g, '')) || 4;

  return {
    bookingId: `booking_${createdAt}`,
    status: 'confirmed',
    source: 'ephemeral',
    trip: {
      id: `trip_${createdAt}`,
      status: 'driver_arriving',
      pickup: request.pickup,
      dropoff: request.dropoff,
      pickupLocation: request.pickupLocation || null,
      dropoffLocation: request.dropoffLocation || null,
      routeLabel: `${request.pickup.split(',')[0]} -> ${request.dropoff.split(',')[0]}`,
      rideType: request.rideType,
      allowMidTripPickup: options.allowMidTripPickup ?? true,
      etaMinutes,
      durationMinutes: request.durationMinutes,
      distanceKm: request.distanceKm,
      routeGeometry: request.route?.geometry || null,
      routeDurationSeconds: request.route?.durationSeconds || request.durationMinutes * 60,
      routeDistanceMeters: request.route?.distanceKm
        ? Math.round(request.route.distanceKm * 1000)
        : Math.round(request.distanceKm * 1000),
      fareTotal: quote.totals.total,
      fareSavings: quote.totals.estimatedSavings,
      vehicle: {
        name: vehicle.name,
        type: vehicle.type,
        color: 'White',
        plateNumber: 'DL 01 AB 1234',
      },
      driver: {
        name: vehicle.driver.name,
        rating: vehicle.driver.rating,
        trips: vehicle.driver.trips,
        phone: '+91 99999 11111',
      },
      midTripOffer:
        options.allowMidTripPickup ?? true
          ? {
              title: 'New rider joining in 3 min!',
              discount: 40,
            }
          : null,
    },
  };
}

async function confirmBooking({ request, match, vehicle, quote, options = {} }) {
  const pool = db.getPool();

  if (!pool) {
    return buildEphemeralBooking({ request, match, vehicle, quote, options });
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const rideRequestId = isUuid(request?.id) ? request.id : null;
    const existingBooking = rideRequestId
      ? await client.query(
          `
            select id
            from bookings
            where ride_request_id = $1
            order by created_at desc
            limit 1
          `,
          [rideRequestId]
        )
      : { rows: [] };

    if (existingBooking.rows[0]?.id) {
      await client.query('commit');
      return getBookingById(existingBooking.rows[0].id);
    }

    const activeTrip = await fetchActiveTripSnapshot(client, match?.id);
    const seatsRequired = Math.max(Number(request?.seatsRequired || 1), 1);

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
        throw new Error('Selected trip no longer has enough seats available.');
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

    if (rideRequestId) {
      await client.query(
        `
          update ride_requests
          set status = 'booked'
          where id = $1
        `,
        [rideRequestId]
      );
    }

    await client.query('commit');

    return (
      (await getBookingById(insertBooking.rows[0].id)) ||
      buildEphemeralBooking({ request, match, vehicle, quote, options })
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  calculateQuote,
  confirmBooking,
  getDriverBookings,
  getBookingById,
  getBookingsForUser,
  updateDriverBookingStatus,
};
