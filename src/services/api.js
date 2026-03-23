import {
  buildMockBooking,
  buildMockMatchResponse,
  buildMockQuote,
} from './mockBackend';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const hasApiBaseUrl = Boolean(API_BASE_URL);

async function requestJson(path, options = {}) {
  const { authToken, body, method = 'POST' } = options;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.text();
    let message = payload || `Request failed with ${response.status}`;

    try {
      const parsed = JSON.parse(payload);
      message = parsed.message || message;
    } catch (_error) {
      // Leave the raw response text as the fallback message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function requestOtp(phone) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/auth/request-otp', {
    body: { phone },
  });
}

export async function verifyOtp(phone, code) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/auth/verify-otp', {
    body: { phone, code },
  });
}

export async function fetchSession(authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/auth/session', {
    authToken,
    method: 'GET',
  });
}

export async function logoutSession(authToken) {
  if (!API_BASE_URL) {
    return null;
  }

  return requestJson('/api/auth/logout', {
    authToken,
    method: 'POST',
  });
}

export async function previewRideMatches(payload, authToken) {
  if (!API_BASE_URL) {
    return buildMockMatchResponse(payload);
  }

  try {
    return await requestJson('/api/ride-requests/preview-match', {
      authToken,
      body: payload,
    });
  } catch (error) {
    return buildMockMatchResponse(payload);
  }
}

export async function fetchBookingQuote(payload, authToken) {
  if (!API_BASE_URL) {
    return buildMockQuote(payload);
  }

  try {
    return await requestJson('/api/bookings/quote', {
      authToken,
      body: payload,
    });
  } catch (error) {
    return buildMockQuote(payload);
  }
}

export async function confirmRideBooking(payload, authToken) {
  if (!API_BASE_URL) {
    return buildMockBooking(payload);
  }

  try {
    return await requestJson('/api/bookings', {
      authToken,
      body: payload,
    });
  } catch (error) {
    return buildMockBooking(payload);
  }
}

export async function fetchBookingDetails(bookingId, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson(`/api/bookings/${bookingId}`, {
    authToken,
    method: 'GET',
  });
}

export async function fetchMyBookings(authToken) {
  if (!API_BASE_URL) {
    return { items: [] };
  }

  return requestJson('/api/me/bookings', {
    authToken,
    method: 'GET',
  });
}
