const db = require('../config/db');
const { getBookingsForUser } = require('./bookingService');
const { getReadinessStatus } = require('./readinessService');
const { normalizeIncident, normalizeTicket } = require('./supportService');
const { emitAdminEvent, emitSupportEvent } = require('./realtimeService');

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeUser(row) {
  return {
    email: row.email || '',
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    rating: Number(row.rating || 5),
    role: row.role,
  };
}

async function getAdminOverview() {
  const [usersResult, bookingsResult, incidentsResult] = await Promise.all([
    db.query(
      `
        select
          role,
          count(*) as total
        from users
        group by role
      `
    ),
    db.query(
      `
        select
          booking_status,
          count(*) as total
        from bookings
        group by booking_status
      `
    ),
    db.query(
      `
        select
          (select count(*) from support_tickets where status not in ('resolved', 'closed')) as open_tickets,
          (select count(*) from sos_incidents where status not in ('resolved', 'closed')) as open_sos
      `
    ),
  ]);

  return {
    bookings: bookingsResult.rows,
    incidents: incidentsResult.rows[0] || {},
    readiness: getReadinessStatus(),
    users: usersResult.rows,
  };
}

async function listAdminUsers(filters = {}) {
  const search = String(filters.q || '').trim();
  const result = await db.query(
    `
      select
        id,
        full_name,
        phone,
        email,
        role,
        rating
      from users
      where
        $1 = ''
        or full_name ilike '%' || $1 || '%'
        or phone ilike '%' || $1 || '%'
        or email ilike '%' || $1 || '%'
      order by created_at desc
      limit 50
    `,
    [search]
  );

  return result.rows.map(normalizeUser);
}

async function listAdminBookings(filters = {}) {
  const search = String(filters.q || '').trim();
  const status = String(filters.status || '').trim().toLowerCase();
  const result = await db.query(
    `
      select
        b.id,
        b.booking_status,
        rr.pickup_label,
        rr.dropoff_label,
        rr.rider_id
      from bookings b
      left join ride_requests rr on rr.id = b.ride_request_id
      where
        ($1 = '' or b.id::text ilike '%' || $1 || '%')
        and ($2 = '' or lower(b.booking_status) = $2)
      order by b.created_at desc
      limit 50
    `,
    [search, status]
  );

  const items = [];

  for (const row of result.rows) {
    const [booking] = row.rider_id ? await getBookingsForUser(row.rider_id).then((items) => items.filter((item) => item.bookingId === row.id)) : [];
    if (booking) {
      items.push(booking);
    }
  }

  return items;
}

async function listAdminIncidents(filters = {}) {
  const status = String(filters.status || '').trim().toLowerCase();
  const [ticketsResult, sosResult] = await Promise.all([
    db.query(
      `
        select *
        from support_tickets
        where ($1 = '' or lower(status) = $1)
        order by created_at desc
        limit 50
      `,
      [status]
    ),
    db.query(
      `
        select *
        from sos_incidents
        where ($1 = '' or lower(status) = $1)
        order by created_at desc
        limit 50
      `,
      [status]
    ),
  ]);

  return {
    sos: sosResult.rows.map(normalizeIncident),
    tickets: ticketsResult.rows.map(normalizeTicket),
  };
}

async function updateAdminIncident({ adminUserId, incidentId, incidentType, status, resolutionNotes }) {
  if (!['sos', 'ticket'].includes(incidentType)) {
    throw buildStatusError('Unsupported incident type.', 400);
  }

  if (incidentType === 'ticket') {
    const result = await db.query(
      `
        update support_tickets
        set
          status = $3,
          resolution_notes = $4,
          assigned_admin_id = $5,
          resolved_at = case when $3 in ('resolved', 'closed') then now() else resolved_at end,
          updated_at = now()
        where id = $1
        returning *
      `,
      [incidentId, incidentType, status, resolutionNotes || null, adminUserId]
    );

    if (!result.rows[0]) {
      throw buildStatusError('Support ticket not found.', 404);
    }

    const ticket = normalizeTicket(result.rows[0]);
    emitSupportEvent('ticket_updated', {
      ticket,
      userId: result.rows[0].user_id,
    });
    emitAdminEvent('ticket_updated', {
      ticketId: ticket.id,
    });
    return {
      ticket,
    };
  }

  const result = await db.query(
    `
      update sos_incidents
      set
        status = $2,
        resolution_notes = $3,
        resolved_by_admin_id = $4,
        resolved_at = case when $2 in ('resolved', 'closed') then now() else resolved_at end,
        updated_at = now()
      where id = $1
      returning *
    `,
    [incidentId, status, resolutionNotes || null, adminUserId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('SOS incident not found.', 404);
  }

  const incident = normalizeIncident(result.rows[0]);
  emitSupportEvent('sos_updated', {
    incident,
    userId: result.rows[0].user_id,
  });
  emitAdminEvent('sos_updated', {
    incidentId: incident.id,
  });
  return {
    incident,
  };
}

async function updateAdminDriver(driverId, payload = {}) {
  const result = await db.query(
    `
      update drivers
      set
        is_online = coalesce($2, is_online),
        return_trip_available = coalesce($3, return_trip_available)
      where user_id = $1
      returning user_id, is_online, return_trip_available
    `,
    [
      driverId,
      typeof payload.isOnline === 'boolean' ? payload.isOnline : null,
      typeof payload.returnTripAvailable === 'boolean' ? payload.returnTripAvailable : null,
    ]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Driver profile not found.', 404);
  }

  emitAdminEvent('driver_updated', {
    driverUserId: driverId,
  });

  return {
    driverUserId: driverId,
    isOnline: result.rows[0].is_online,
    returnTripAvailable: result.rows[0].return_trip_available,
  };
}

module.exports = {
  getAdminOverview,
  listAdminBookings,
  listAdminIncidents,
  listAdminUsers,
  updateAdminDriver,
  updateAdminIncident,
};
