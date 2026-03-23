const DEFAULT_BASE_URL = 'http://127.0.0.1:4000';
const API_BASE_URL = process.env.API_BASE_URL || DEFAULT_BASE_URL;
const REQUEST_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 8000);
const ENABLE_BOOKING_WRITE =
  String(process.env.SMOKE_BOOKING_WRITE || '').toLowerCase() === 'true';

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function requestJson(path, options = {}) {
  const { body, method = 'GET' } = options;
  const { signal, clear } = timeoutSignal(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || `Request failed with ${response.status}`);
    }

    return payload;
  } finally {
    clear();
  }
}

function buildPreviewPayloads() {
  const departureTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return [
    {
      pickup: 'Connaught Place, New Delhi',
      dropoff: 'Akshardham Temple, Delhi',
      rideType: 'shared',
      seatsRequired: 1,
      allowMidTripPickup: true,
      departureTime,
    },
    {
      pickup: 'India Gate, New Delhi',
      dropoff: 'Akshardham, Delhi',
      rideType: 'shared',
      seatsRequired: 1,
      allowMidTripPickup: true,
      departureTime,
    },
    {
      pickup: 'Cyber Hub, Gurgaon',
      dropoff: 'Connaught Place, New Delhi',
      rideType: 'shared',
      seatsRequired: 1,
      allowMidTripPickup: false,
      departureTime,
    },
  ];
}

async function findPreviewMatch() {
  const previewPayloads = buildPreviewPayloads();

  for (const payload of previewPayloads) {
    const preview = await requestJson('/api/ride-requests/preview-match', {
      method: 'POST',
      body: payload,
    });

    if (Array.isArray(preview.matches) && preview.matches.length > 0) {
      return preview;
    }
  }

  throw new Error('Preview match returned no matches for all configured routes');
}

async function main() {
  const health = await requestJson('/health');
  const preview = await findPreviewMatch();

  if (!Array.isArray(preview.matches) || preview.matches.length === 0) {
    throw new Error('Preview match returned no matches');
  }

  const match = preview.matches[0];
  const vehicle = match.vehicles?.[0];

  if (!vehicle) {
    throw new Error('Preview match returned no vehicle options');
  }

  const quote = await requestJson('/api/bookings/quote', {
    method: 'POST',
    body: {
      request: preview.request,
      match,
      vehicle,
      options: {
        insurance: true,
        allowMidTripPickup: true,
      },
    },
  });

  const summary = {
    ok: true,
    baseUrl: API_BASE_URL,
    databaseConfigured: health.databaseConfigured,
    requestId: preview.request.id,
    matchId: match.id,
    quoteTotal: quote.totals?.total,
    driverName: vehicle.driver?.name,
    bookingWriteEnabled: ENABLE_BOOKING_WRITE,
  };

  if (ENABLE_BOOKING_WRITE) {
    const booking = await requestJson('/api/bookings', {
      method: 'POST',
      body: {
        request: preview.request,
        match,
        vehicle,
        quote,
        options: {
          paymentMethod: 'upi',
          allowMidTripPickup: true,
        },
      },
    });

    const fetchedBooking = await requestJson(`/api/bookings/${booking.bookingId}`);

    summary.bookingId = booking.bookingId;
    summary.fetchedBookingId = fetchedBooking.bookingId;
    summary.fareTotal = fetchedBooking.trip?.fareTotal;
    summary.persistedDriverName = fetchedBooking.trip?.driver?.name;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl: API_BASE_URL,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
