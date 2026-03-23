const db = require('../config/db');

function toNumber(value) {
  return Number(value || 0);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function estimateDurationMinutes(distanceKm) {
  return Math.max(Math.round(toNumber(distanceKm) * 2.3), 15);
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

  return {
    bookingId: row.booking_id,
    status: row.booking_status || 'confirmed',
    trip: {
      id: row.active_trip_id || `trip_booking_${row.booking_id}`,
      status: row.active_trip_status || 'driver_arriving',
      pickup: pickupLabel,
      dropoff: dropoffLabel,
      routeLabel: `${pickupLabel.split(',')[0]} -> ${dropoffLabel.split(',')[0]}`,
      rideType: row.ride_type || 'shared',
      allowMidTripPickup,
      etaMinutes: Math.max(toNumber(row.vehicle_eta_minutes || 4), 3),
      durationMinutes: estimateDurationMinutes(distanceKm),
      distanceKm,
      fareTotal: Math.round(toNumber(row.quoted_total)),
      fareSavings: Math.round(toNumber(row.shared_savings)),
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
      midTripOffer:
        allowMidTripPickup && (row.allow_mid_trip_join ?? true)
          ? {
              title: 'New rider joining in 3 min!',
              discount: 40,
            }
          : null,
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
        rr.id as ride_request_id,
        rr.pickup_label,
        rr.dropoff_label,
        rr.ride_type,
        rr.allow_mid_trip_pickup,
        rr.origin_km,
        rr.destination_km,
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
        rr.ride_type,
        rr.allow_mid_trip_pickup,
        rr.origin_km,
        rr.destination_km,
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
      routeLabel: `${request.pickup.split(',')[0]} -> ${request.dropoff.split(',')[0]}`,
      rideType: request.rideType,
      allowMidTripPickup: options.allowMidTripPickup ?? true,
      etaMinutes,
      durationMinutes: request.durationMinutes,
      distanceKm: request.distanceKm,
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

    const rideRequestId = isUuid(request?.id) ? request.id : null;
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
  getBookingById,
  getBookingsForUser,
};
