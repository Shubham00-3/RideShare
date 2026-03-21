const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { previewMatches } = require('./services/matchingService');
const { calculateQuote, confirmBooking } = require('./services/bookingService');

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

app.post('/api/ride-requests/preview-match', async (req, res, next) => {
  try {
    const response = await previewMatches(req.body || {});
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

app.post('/api/bookings', (req, res, next) => {
  try {
    const payload = req.body || {};
    const quote = payload.quote || calculateQuote(payload);
    const booking = confirmBooking({ ...payload, quote });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'internal_server_error',
    message: error.message || 'Unexpected server error',
  });
});

app.listen(env.port, () => {
  console.log(`RideShare Connect API listening on port ${env.port}`);
});
