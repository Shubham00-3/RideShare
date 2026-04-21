const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');
const { notifyUsers } = require('./notificationService');
const { emitAdminEvent, emitBookingEvent, emitSupportEvent } = require('./realtimeService');

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeTicket(row) {
  return {
    bookingId: row.booking_id || null,
    category: row.category,
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    priority: row.priority,
    resolutionNotes: row.resolution_notes || '',
    resolvedAt: row.resolved_at || null,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function normalizeIncident(row) {
  return {
    bookingId: row.booking_id || null,
    createdAt: row.created_at,
    emergencyContacts: Array.isArray(row.emergency_contacts_snapshot)
      ? row.emergency_contacts_snapshot
      : [],
    id: row.id,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    resolutionNotes: row.resolution_notes || '',
    resolvedAt: row.resolved_at || null,
    status: row.status,
    summary: row.summary || '',
    supportTicketId: row.support_ticket_id || null,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

async function ensureBookingAccess(bookingId, userId, userRole = 'rider') {
  const result = await db.query(
    `
      select
        b.id as booking_id,
        rr.rider_id,
        d.user_id as driver_user_id
      from bookings b
      left join ride_requests rr on rr.id = b.ride_request_id
      left join active_trips at on at.id = b.active_trip_id
      left join drivers d on d.id = at.driver_id
      where b.id = $1
      limit 1
    `,
    [bookingId]
  );

  const row = result.rows[0];

  if (!row) {
    throw buildStatusError('Booking not found.', 404);
  }

  if (
    row.rider_id !== userId &&
    row.driver_user_id !== userId &&
    userRole !== 'admin'
  ) {
    throw buildStatusError('You do not have access to this booking.', 403);
  }

  return row;
}

async function createShareToken({ bookingId, userId, userRole = 'rider' }) {
  await ensureBookingAccess(bookingId, userId, userRole);

  const rawToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await db.query(
    `
      insert into booking_share_tokens (
        booking_id,
        token_hash,
        expires_at
      )
      values ($1, $2, $3)
    `,
    [bookingId, hashValue(rawToken), expiresAt.toISOString()]
  );

  const sharedTrip = await getSharedTripByToken(rawToken);

  return {
    bookingId,
    expiresAt: expiresAt.toISOString(),
    shareUrl: `${env.appBaseUrl || `http://localhost:${env.port}`}/share/trips/${rawToken}`,
    trip: sharedTrip,
    token: rawToken,
  };
}

async function getSharedTripByToken(token) {
  if (!token) {
    throw buildStatusError('Share token is required.', 400);
  }

  const result = await db.query(
    `
      select
        b.id as booking_id,
        b.booking_status,
        rr.pickup_label,
        rr.dropoff_label,
        rr.route_geometry,
        at.current_lat,
        at.current_lng,
        at.last_location_at,
        driver.full_name as driver_name,
        v.display_name as vehicle_name
      from booking_share_tokens bst
      join bookings b on b.id = bst.booking_id
      left join ride_requests rr on rr.id = b.ride_request_id
      left join active_trips at on at.id = b.active_trip_id
      left join drivers driver on driver.id = at.driver_id
      left join vehicles v on v.id = at.vehicle_id
      where bst.token_hash = $1
        and bst.revoked_at is null
        and bst.expires_at > now()
      limit 1
    `,
    [hashValue(token)]
  );

  const row = result.rows[0];

  if (!row) {
    throw buildStatusError('This share link has expired or is no longer available.', 404);
  }

  return {
    bookingId: row.booking_id,
    currentLocation:
      row.current_lat != null && row.current_lng != null
        ? {
            coordinates: {
              latitude: Number(row.current_lat),
              longitude: Number(row.current_lng),
            },
            lastUpdatedAt: row.last_location_at || null,
          }
        : null,
    driver: row.driver_name
      ? {
          name: row.driver_name,
        }
      : null,
    dropoff: row.dropoff_label,
    pickup: row.pickup_label,
    routeGeometry: row.route_geometry || null,
    status: row.booking_status,
    vehicle: row.vehicle_name
      ? {
          name: row.vehicle_name,
        }
      : null,
  };
}

async function createSupportTicket({
  userId,
  userRole = 'rider',
  bookingId = null,
  category,
  message,
  priority = 'normal',
}) {
  const trimmedMessage = String(message || '').trim();
  const normalizedCategory = String(category || 'general').trim().toLowerCase();
  const normalizedPriority = String(priority || 'normal').trim().toLowerCase();

  if (!trimmedMessage) {
    throw buildStatusError('Support messages cannot be empty.', 400);
  }

  if (bookingId) {
    await ensureBookingAccess(bookingId, userId, userRole);
  }

  const result = await db.query(
    `
      insert into support_tickets (
        user_id,
        booking_id,
        category,
        priority,
        message
      )
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [userId, bookingId, normalizedCategory, normalizedPriority, trimmedMessage]
  );

  const ticket = normalizeTicket(result.rows[0]);
  emitSupportEvent('ticket_created', {
    ticket,
    userId,
  });
  emitAdminEvent('ticket_created', {
    ticketId: ticket.id,
  });

  await notifyUsers(
    [userId],
    {
      body: 'Your support request is now in the queue.',
      data: {
        ticketId: ticket.id,
      },
      title: 'Support request received',
    },
    {
      preferenceColumn: 'trip_updates_enabled',
    }
  );

  return ticket;
}

async function listSupportTicketsForUser(userId) {
  const result = await db.query(
    `
      select *
      from support_tickets
      where user_id = $1
      order by created_at desc
    `,
    [userId]
  );

  return result.rows.map(normalizeTicket);
}

async function createSosIncident({
  bookingId,
  userId,
  userRole = 'rider',
  summary,
  latitude = null,
  longitude = null,
}) {
  await ensureBookingAccess(bookingId, userId, userRole);

  const contactsResult = await db.query(
    `
      select
        name,
        phone,
        relationship
      from emergency_contacts
      where user_id = $1
      order by updated_at desc
    `,
    [userId]
  );

  const contacts = contactsResult.rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    relationship: row.relationship || '',
  }));
  const ticket = await createSupportTicket({
    bookingId,
    category: 'sos',
    message: summary || 'Emergency SOS triggered from active trip.',
    priority: 'urgent',
    userId,
    userRole,
  });

  const result = await db.query(
    `
      insert into sos_incidents (
        booking_id,
        user_id,
        support_ticket_id,
        summary,
        latitude,
        longitude,
        emergency_contacts_snapshot
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
      returning *
    `,
    [
      bookingId,
      userId,
      ticket.id,
      summary || 'Emergency SOS triggered from active trip.',
      latitude == null ? null : Number(latitude),
      longitude == null ? null : Number(longitude),
      JSON.stringify(contacts),
    ]
  );

  const incident = normalizeIncident(result.rows[0]);
  emitSupportEvent('sos_opened', {
    bookingId,
    incident,
    userId,
  });
  await emitBookingEvent('sos_opened', bookingId);
  await notifyUsers(
    [userId],
    {
      body: 'We opened an SOS incident and alerted support.',
      data: {
        bookingId,
        incidentId: incident.id,
      },
      title: 'SOS activated',
    },
    {
      preferenceColumn: 'safety_alerts_enabled',
    }
  );

  return {
    incident,
    supportTicket: ticket,
  };
}

module.exports = {
  createShareToken,
  createSosIncident,
  createSupportTicket,
  getSharedTripByToken,
  listSupportTicketsForUser,
  normalizeIncident,
  normalizeTicket,
};
