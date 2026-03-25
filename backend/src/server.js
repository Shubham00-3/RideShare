const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { optionalAuth, readAuthToken, requireAuth } = require('./middleware/auth');
const {
  getSessionFromToken,
  requestOtp,
  revokeSession,
  verifyOtp,
} = require('./services/authService');
const {
  acceptIncomingRequest,
  getDriverDashboard,
  updateDriverAvailability,
} = require('./services/driverDispatchService');
const {
  autocompletePlaces,
  buildRoutePreview,
} = require('./services/mappingService');
const { previewMatches } = require('./services/matchingService');
const {
  calculateQuote,
  confirmBooking,
  getBookingById,
  getBookingsForUser,
  updateDriverBookingStatus,
} = require('./services/bookingService');

const app = express();

app.use(cors({ origin: env.allowedOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rideshare-connect-api',
    databaseConfigured: Boolean(env.databaseUrl),
    mapping: {
      peliasConfigured: Boolean(env.peliasBaseUrl),
      valhallaConfigured: Boolean(env.valhallaBaseUrl),
    },
  });
});

app.get('/api/maps/autocomplete', async (req, res, next) => {
  try {
    const places = await autocompletePlaces(req.query?.q, {
      focusPoint:
        req.query?.lat && req.query?.lng
          ? {
              latitude: Number(req.query.lat),
              longitude: Number(req.query.lng),
            }
          : null,
    });
    res.json({
      items: places,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/maps/route', async (req, res, next) => {
  try {
    const route = await buildRoutePreview(req.body || {});
    res.json(route);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/request-otp', async (req, res, next) => {
  try {
    const response = await requestOtp(req.body?.phone);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-otp', async (req, res, next) => {
  try {
    const response = await verifyOtp(req.body?.phone, req.body?.code);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/session', requireAuth, async (req, res) => {
  res.json(req.auth);
});

app.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await revokeSession(readAuthToken(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/ride-requests/preview-match', optionalAuth, async (req, res, next) => {
  try {
    const response = await previewMatches(req.body || {}, {
      userId: req.auth?.user?.id || null,
    });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/quote', (req, res, next) => {
  try {
    const payload = req.body || {};
    const quote = calculateQuote(payload);
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings', optionalAuth, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const quote = payload.quote || calculateQuote(payload);
    const booking = await confirmBooking({ ...payload, quote });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings/:id', optionalAuth, async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: 'Booking not found',
      });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/bookings', requireAuth, async (req, res, next) => {
  try {
    const bookings = await getBookingsForUser(req.auth.user.id);
    res.json({
      items: bookings,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/driver/me/trips', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.user.role !== 'driver') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Driver access is required for this route.',
      });
    }

    const payload = await getDriverDashboard(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/driver/me/settings', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.user.role !== 'driver') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Driver access is required for this route.',
      });
    }

    const payload = await updateDriverAvailability(req.auth.user.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/driver/bookings/:id/status', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.user.role !== 'driver') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Driver access is required for this route.',
      });
    }

    const booking = await updateDriverBookingStatus({
      bookingId: req.params.id,
      status: req.body?.status,
      userId: req.auth.user.id,
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

app.post('/api/driver/requests/:id/accept', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.user.role !== 'driver') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Driver access is required for this route.',
      });
    }

    const booking = await acceptIncomingRequest({
      requestId: req.params.id,
      userId: req.auth.user.id,
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.message || 'Unexpected server error';
  const lowerMessage = message.toLowerCase();
  const statusCode =
    lowerMessage.includes('otp') ||
    lowerMessage.includes('phone') ||
    lowerMessage.includes('session') ||
    lowerMessage.includes('authentication')
      ? 400
      : 500;

  res.status(statusCode).json({
    error: statusCode === 400 ? 'bad_request' : 'internal_server_error',
    message,
  });
});

app.listen(env.port, () => {
  console.log(`RideShare Connect API listening on port ${env.port}`);
});
