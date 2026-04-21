const { Server } = require('socket.io');
const db = require('../config/db');
const env = require('../config/env');
const { getSessionFromToken } = require('./authService');

let io = null;

async function resolveSocketSession(socket) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
    null;

  if (!token) {
    return null;
  }

  return getSessionFromToken(token, {
    touch: false,
  });
}

function attachRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: env.allowedOrigin,
    },
  });

  io.use(async (socket, next) => {
    try {
      socket.session = await resolveSocketSession(socket);
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.session?.user || null;

    if (user?.id) {
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);

      if (user.role === 'admin') {
        socket.join('admin:global');
      }
    }

    socket.on('watch:booking', ({ bookingId }) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
      }
    });

    socket.on('unwatch:booking', ({ bookingId }) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
      }
    });

    socket.on('watch:trip', ({ tripId }) => {
      if (tripId) {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on('unwatch:trip', ({ tripId }) => {
      if (tripId) {
        socket.leave(`trip:${tripId}`);
      }
    });

    socket.on('watch:driver', () => {
      if (user?.id && (user.role === 'driver' || user.role === 'admin')) {
        socket.join(`driver:${user.id}`);
      }
    });

    socket.on('watch:admin', () => {
      if (user?.role === 'admin') {
        socket.join('admin:global');
      }
    });
  });

  return io;
}

function emitToRooms(rooms, event, payload) {
  if (!io) {
    return;
  }

  [...new Set(rooms.filter(Boolean))].forEach((room) => {
    io.to(room).emit(event, payload);
  });
}

async function emitBookingEvent(eventType, bookingId) {
  if (!bookingId) {
    return;
  }

  const audienceResult = await db.query(
    `
      select
        rr.rider_id,
        d.user_id as driver_user_id,
        b.active_trip_id
      from bookings b
      left join ride_requests rr on rr.id = b.ride_request_id
      left join active_trips at on at.id = b.active_trip_id
      left join drivers d on d.id = at.driver_id
      where b.id = $1
      limit 1
    `,
    [bookingId]
  );

  const audience = audienceResult?.rows?.[0];

  if (!audience) {
    return;
  }

  const { getBookingById } = require('./bookingService');
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return;
  }

  emitToRooms(
    [
      `booking:${bookingId}`,
      audience.active_trip_id ? `trip:${audience.active_trip_id}` : null,
      audience.rider_id ? `user:${audience.rider_id}` : null,
      audience.driver_user_id ? `user:${audience.driver_user_id}` : null,
      audience.driver_user_id ? `driver:${audience.driver_user_id}` : null,
      'admin:global',
    ],
    'booking:update',
    {
      booking,
      bookingId,
      eventType,
      tripId: audience.active_trip_id || null,
    }
  );
}

function emitSupportEvent(eventType, payload) {
  emitToRooms(
    [
      payload?.userId ? `user:${payload.userId}` : null,
      payload?.adminOnly ? null : payload?.driverUserId ? `user:${payload.driverUserId}` : null,
      'admin:global',
    ],
    'support:update',
    {
      eventType,
      ...payload,
    }
  );
}

function emitAdminEvent(eventType, payload) {
  emitToRooms(['admin:global'], 'admin:update', {
    eventType,
    ...payload,
  });
}

module.exports = {
  attachRealtime,
  emitAdminEvent,
  emitBookingEvent,
  emitSupportEvent,
};
