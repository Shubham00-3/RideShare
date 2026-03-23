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
const { previewMatches } = require('./services/matchingService');
const {
  calculateQuote,
  confirmBooking,
  getBookingById,
  getBookingsForUser,
} = require('./services/bookingService');

const app = express();

app.use(cors({ origin: env.allowedOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rideshare-connect-api',
    databaseConfigured: Boolean(env.databaseUrl),
  });
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
