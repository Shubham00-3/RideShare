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
  const { authToken, body, method = 'GET' } = options;
  const { signal, clear } = timeoutSignal(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
    const riderOtp = await requestJson('/api/auth/request-otp', {
      method: 'POST',
      body: {
        phone: '9876543210',
      },
    });

    if (!riderOtp.devOtp) {
      throw new Error(
        'Authenticated smoke flow requires AUTH_EXPOSE_DEV_OTP=true or another non-interactive test OTP setup.'
      );
    }

    const riderSession = await requestJson('/api/auth/verify-otp', {
      method: 'POST',
      body: {
        phone: '9876543210',
        code: riderOtp.devOtp,
      },
    });

    const booking = await requestJson('/api/bookings', {
      method: 'POST',
      authToken: riderSession.token,
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

    const fetchedBooking = await requestJson(`/api/bookings/${booking.bookingId}`, {
      authToken: riderSession.token,
    });
    const riderHistory = await requestJson('/api/me/bookings', {
      authToken: riderSession.token,
    });

    await requestJson('/api/ride-requests/preview-match', {
      method: 'POST',
      authToken: riderSession.token,
      body: {
        pickup: 'Connaught Place, New Delhi',
        dropoff: 'Akshardham Temple, Delhi',
        rideType: 'shared',
        seatsRequired: 1,
        allowMidTripPickup: true,
        departureTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      },
    });

    const driverOtp = await requestJson('/api/auth/request-otp', {
      method: 'POST',
      body: {
        phone: '9999900001',
      },
    });

    if (!driverOtp.devOtp) {
      throw new Error('Driver smoke flow requires a dev OTP to be exposed.');
    }

    const driverSession = await requestJson('/api/auth/verify-otp', {
      method: 'POST',
      body: {
        phone: '9999900001',
        code: driverOtp.devOtp,
      },
    });
    const driverDashboard = await requestJson('/api/driver/me/trips', {
      authToken: driverSession.token,
    });
    const pendingRequestId = driverDashboard.pendingRequests?.[0]?.id;

    let acceptedBooking = null;

    if (pendingRequestId) {
      acceptedBooking = await requestJson(`/api/driver/requests/${pendingRequestId}/accept`, {
        method: 'POST',
        authToken: driverSession.token,
      });

      await requestJson(`/api/driver/bookings/${acceptedBooking.bookingId}/status`, {
        method: 'PATCH',
        authToken: driverSession.token,
        body: {
          status: 'on_trip',
        },
      });

      await requestJson('/api/driver/me/location', {
        method: 'PATCH',
        authToken: driverSession.token,
        body: {
          bookingId: acceptedBooking.bookingId,
          latitude: 28.621,
          longitude: 77.251,
        },
      });
    }

    summary.bookingId = booking.bookingId;
    summary.fetchedBookingId = fetchedBooking.bookingId;
    summary.fareTotal = fetchedBooking.trip?.fareTotal;
    summary.persistedDriverName = fetchedBooking.trip?.driver?.name;
    summary.riderHistoryCount = riderHistory.items?.length || 0;
    summary.driverDashboardTrips = driverDashboard.items?.length || 0;
    summary.acceptedBookingId = acceptedBooking?.bookingId || null;
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
