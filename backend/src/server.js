const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { optionalAuth, readAuthToken, requireAuth } = require('./middleware/auth');
const {
  getSessionFromToken,
  requestOtp,
  revokeSession,
  updateUserProfile,
  verifyOtp,
} = require('./services/authService');
const {
  acceptIncomingRequest,
  getDriverDashboard,
  updateDriverLocation,
  updateDriverAvailability,
} = require('./services/driverDispatchService');
const {
  autocompletePlaces,
  buildRoutePreview,
} = require('./services/mappingService');
const { previewMatches } = require('./services/matchingService');
const {
  cancelBookingForUser,
  calculateQuote,
  confirmBooking,
  getBookingById,
  getBookingsForUser,
  updateDriverBookingStatus,
} = require('./services/bookingService');
const {
  createEmergencyContact,
  createPaymentMethod,
  createSavedPlace,
  deleteEmergencyContact,
  deletePaymentMethod,
  deleteSavedPlace,
  getProfileSummary,
  listEmergencyContacts,
  listPaymentMethods,
  listSavedPlaces,
  updateEmergencyContact,
  updatePaymentMethod,
  updateSavedPlace,
} = require('./services/userDataService');
const { assertStartupReadiness, getReadinessStatus } = require('./services/readinessService');

const app = express();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(cors({ origin: env.allowedOrigin }));
app.use(express.json({ limit: env.jsonBodyLimit }));

app.get('/health', (_req, res) => {
  const readiness = getReadinessStatus();

  res.json({
    ok: true,
    service: 'rideshare-connect-api',
    readiness,
  });
});

app.get('/ready', (_req, res) => {
  const readiness = getReadinessStatus();
  res.status(readiness.ok ? 200 : 503).json(readiness);
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
      userRole: req.auth?.user?.role || null,
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

app.post('/api/bookings', requireAuth, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const quote = payload.quote || calculateQuote(payload);
    const booking = await confirmBooking({
      ...payload,
      quote,
      userId: req.auth.user.id,
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings/:id', requireAuth, async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id, {
      userId: req.auth.user.id,
      userRole: req.auth.user.role,
    });

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

app.patch('/api/me/profile', requireAuth, async (req, res, next) => {
  try {
    const payload = await updateUserProfile(req.auth.user.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/profile-summary', requireAuth, async (req, res, next) => {
  try {
    const payload = await getProfileSummary(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/saved-places', requireAuth, async (req, res, next) => {
  try {
    const payload = await listSavedPlaces(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/saved-places', requireAuth, async (req, res, next) => {
  try {
    const payload = await createSavedPlace(req.auth.user.id, req.body || {});
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/saved-places/:id', requireAuth, async (req, res, next) => {
  try {
    const payload = await updateSavedPlace(req.auth.user.id, req.params.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/saved-places/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteSavedPlace(req.auth.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/payment-methods', requireAuth, async (req, res, next) => {
  try {
    const payload = await listPaymentMethods(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/payment-methods', requireAuth, async (req, res, next) => {
  try {
    const payload = await createPaymentMethod(req.auth.user.id, req.body || {});
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/payment-methods/:id', requireAuth, async (req, res, next) => {
  try {
    const payload = await updatePaymentMethod(req.auth.user.id, req.params.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/payment-methods/:id', requireAuth, async (req, res, next) => {
  try {
    await deletePaymentMethod(req.auth.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/emergency-contacts', requireAuth, async (req, res, next) => {
  try {
    const payload = await listEmergencyContacts(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/emergency-contacts', requireAuth, async (req, res, next) => {
  try {
    const payload = await createEmergencyContact(req.auth.user.id, req.body || {});
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/emergency-contacts/:id', requireAuth, async (req, res, next) => {
  try {
    const payload = await updateEmergencyContact(req.auth.user.id, req.params.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/emergency-contacts/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteEmergencyContact(req.auth.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings/:id/stream', requireAuth, async (req, res) => {
  const sendBooking = async () => {
    const booking = await getBookingById(req.params.id, {
      userId: req.auth.user.id,
      userRole: req.auth.user.role,
    });

    if (!booking) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Booking not found' })}\n\n`);
      return false;
    }

    res.write(`event: booking\ndata: ${JSON.stringify(booking)}\n\n`);
    return true;
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache, no-transform',
  });
  res.write(': connected\n\n');

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);
  const interval = setInterval(() => {
    sendBooking().catch((error) => {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
    });
  }, 5000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(keepAlive);
    res.end();
  });

  sendBooking().catch((error) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
  });
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

app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const booking = await cancelBookingForUser({
      bookingId: req.params.id,
      userId: req.auth.user.id,
    });
    res.json(booking);
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

app.patch('/api/driver/me/location', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.user.role !== 'driver') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Driver access is required for this route.',
      });
    }

    const payload = await updateDriverLocation({
      bookingId: req.body?.bookingId,
      latitude: req.body?.latitude,
      longitude: req.body?.longitude,
      userId: req.auth.user.id,
    });
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
  const inferredStatusCode =
    lowerMessage.includes('otp') ||
    lowerMessage.includes('phone') ||
    lowerMessage.includes('session') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('latitude') ||
    lowerMessage.includes('longitude') ||
    lowerMessage.includes('validation')
      ? 400
      : 500;
  const statusCode = Number(error.statusCode || inferredStatusCode);

  res.status(statusCode).json({
    error:
      statusCode === 400
        ? 'bad_request'
        : statusCode === 401
          ? 'unauthorized'
        : statusCode === 403
          ? 'forbidden'
        : statusCode === 404
          ? 'not_found'
          : statusCode === 503
            ? 'service_unavailable'
            : 'internal_server_error',
    message,
  });
});

function startServer() {
  assertStartupReadiness();

  return app.listen(env.port, () => {
    console.log(`RideShare Connect API listening on port ${env.port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
