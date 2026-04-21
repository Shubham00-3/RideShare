const express = require('express');
const http = require('http');
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
  updateDriverLocation,
} = require('./services/driverDispatchService');
const {
  autocompletePlaces,
  buildRoutePreview,
} = require('./services/mappingService');
const { previewMatches } = require('./services/matchingService');
const {
  adminUpdateBooking,
  cancelBookingForUser,
  calculateQuote,
  confirmBooking,
  getBookingById,
  getBookingsForUser,
  getRatingsForUser,
  rescheduleBooking,
  submitBookingRating,
  updateDriverBookingStatus,
} = require('./services/bookingService');
const {
  createEmergencyContact,
  createSavedPlace,
  deleteEmergencyContact,
  deleteSavedPlace,
  getNotificationPreferences,
  getProfile,
  listEmergencyContacts,
  listSavedPlaces,
  registerDevicePushToken,
  revokeDevicePushToken,
  updateEmergencyContact,
  updateNotificationPreferences,
  updateProfile,
  updateSavedPlace,
} = require('./services/profileService');
const {
  createShareToken,
  createSosIncident,
  createSupportTicket,
  getSharedTripByToken,
  listSupportTicketsForUser,
} = require('./services/supportService');
const {
  getAdminOverview,
  listAdminBookings,
  listAdminIncidents,
  listAdminUsers,
  updateAdminDriver,
  updateAdminIncident,
} = require('./services/adminService');
const { attachRealtime } = require('./services/realtimeService');
const { assertStartupReadiness, getReadinessStatus } = require('./services/readinessService');

const app = express();

app.use(cors({ origin: env.allowedOrigin }));
app.use(express.json());

function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth?.user || req.auth.user.role !== role) {
      return res.status(403).json({
        error: 'forbidden',
        message: `${role.charAt(0).toUpperCase()}${role.slice(1)} access is required for this route.`,
      });
    }

    return next();
  };
}

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

app.get('/share/trips/:token', async (req, res, next) => {
  try {
    const payload = await getSharedTripByToken(req.params.token);
    res.json(payload);
  } catch (error) {
    next(error);
  }
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

    return res.json(booking);
  } catch (error) {
    return next(error);
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

app.patch('/api/bookings/:id/schedule', requireAuth, async (req, res, next) => {
  try {
    const booking = await rescheduleBooking({
      bookingId: req.params.id,
      departureTime: req.body?.departureTime,
      userId: req.auth.user.id,
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/:id/rating', requireAuth, async (req, res, next) => {
  try {
    const booking = await submitBookingRating({
      bookingId: req.params.id,
      comment: req.body?.comment,
      score: req.body?.score,
      userId: req.auth.user.id,
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/ratings', requireAuth, async (req, res, next) => {
  try {
    const ratings = await getRatingsForUser(req.auth.user.id);
    res.json(ratings);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/:id/share', requireAuth, async (req, res, next) => {
  try {
    const payload = await createShareToken({
      bookingId: req.params.id,
      userId: req.auth.user.id,
      userRole: req.auth.user.role,
    });
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/:id/sos', requireAuth, async (req, res, next) => {
  try {
    const payload = await createSosIncident({
      bookingId: req.params.id,
      latitude: req.body?.latitude,
      longitude: req.body?.longitude,
      summary: req.body?.summary,
      userId: req.auth.user.id,
      userRole: req.auth.user.role,
    });
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/support/tickets', requireAuth, async (req, res, next) => {
  try {
    const ticket = await createSupportTicket({
      bookingId: req.body?.bookingId,
      category: req.body?.category,
      message: req.body?.message,
      priority: req.body?.priority,
      userId: req.auth.user.id,
      userRole: req.auth.user.role,
    });
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/support-tickets', requireAuth, async (req, res, next) => {
  try {
    const items = await listSupportTicketsForUser(req.auth.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/profile', requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfile(req.auth.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/profile', requireAuth, async (req, res, next) => {
  try {
    const profile = await updateProfile(req.auth.user.id, req.body || {});
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/saved-places', requireAuth, async (req, res, next) => {
  try {
    const items = await listSavedPlaces(req.auth.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/saved-places', requireAuth, async (req, res, next) => {
  try {
    const item = await createSavedPlace(req.auth.user.id, req.body || {});
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/saved-places/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await updateSavedPlace(req.auth.user.id, req.params.id, req.body || {});
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/saved-places/:id', requireAuth, async (req, res, next) => {
  try {
    const payload = await deleteSavedPlace(req.auth.user.id, req.params.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/emergency-contacts', requireAuth, async (req, res, next) => {
  try {
    const items = await listEmergencyContacts(req.auth.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/emergency-contacts', requireAuth, async (req, res, next) => {
  try {
    const item = await createEmergencyContact(req.auth.user.id, req.body || {});
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/emergency-contacts/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await updateEmergencyContact(req.auth.user.id, req.params.id, req.body || {});
    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/emergency-contacts/:id', requireAuth, async (req, res, next) => {
  try {
    const payload = await deleteEmergencyContact(req.auth.user.id, req.params.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/notification-preferences', requireAuth, async (req, res, next) => {
  try {
    const preferences = await getNotificationPreferences(req.auth.user.id);
    res.json(preferences);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/notification-preferences', requireAuth, async (req, res, next) => {
  try {
    const preferences = await updateNotificationPreferences(req.auth.user.id, req.body || {});
    res.json(preferences);
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/push-tokens', requireAuth, async (req, res, next) => {
  try {
    const payload = await registerDevicePushToken(req.auth.user.id, req.body || {});
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/push-tokens/:token', requireAuth, async (req, res, next) => {
  try {
    const payload = await revokeDevicePushToken(req.auth.user.id, req.params.token);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/driver/me/trips', requireAuth, requireRole('driver'), async (req, res, next) => {
  try {
    const payload = await getDriverDashboard(req.auth.user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/driver/me/settings', requireAuth, requireRole('driver'), async (req, res, next) => {
  try {
    const payload = await updateDriverAvailability(req.auth.user.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/driver/me/location', requireAuth, requireRole('driver'), async (req, res, next) => {
  try {
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

app.patch('/api/driver/bookings/:id/status', requireAuth, requireRole('driver'), async (req, res, next) => {
  try {
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

app.post('/api/driver/requests/:id/accept', requireAuth, requireRole('driver'), async (req, res, next) => {
  try {
    const booking = await acceptIncomingRequest({
      requestId: req.params.id,
      userId: req.auth.user.id,
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/overview', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const payload = await getAdminOverview();
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const items = await listAdminUsers(req.query || {});
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/bookings', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const items = await listAdminBookings(req.query || {});
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/incidents', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = await listAdminIncidents(req.query || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/bookings/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const booking = await adminUpdateBooking({
      bookingId: req.params.id,
      status: req.body?.status,
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/incidents/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = await updateAdminIncident({
      adminUserId: req.auth.user.id,
      incidentId: req.params.id,
      incidentType: req.body?.incidentType,
      resolutionNotes: req.body?.resolutionNotes,
      status: req.body?.status,
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/drivers/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = await updateAdminDriver(req.params.id, req.body || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.message || 'Unexpected server error';
  const lowerMessage = message.toLowerCase();
  const inferredStatusCode =
    lowerMessage.includes('authoriz') || lowerMessage.includes('access')
      ? 403
      : lowerMessage.includes('authentication') || lowerMessage.includes('session')
        ? 401
        : lowerMessage.includes('otp') ||
            lowerMessage.includes('phone') ||
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
              : 'internal_server_error',
    message,
  });
});

function startServer() {
  assertStartupReadiness();

  const server = http.createServer(app);
  attachRealtime(server);

  return server.listen(env.port, () => {
    console.log(`RideShare Connect API listening on port ${env.port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  getSessionFromToken,
  startServer,
};
