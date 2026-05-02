import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 8000;
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';

function resolveApiBaseUrl() {
  if (!configuredApiBaseUrl) {
    return '';
  }

  if (Platform.OS === 'android') {
    return configuredApiBaseUrl.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
  }

  return configuredApiBaseUrl;
}

function buildReachabilityHint(baseUrl) {
  if (!baseUrl) {
    return '';
  }

  if (baseUrl.includes('10.0.2.2')) {
    return ' If you are testing on a physical phone, use your computer LAN IP instead of 127.0.0.1.';
  }

  if (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost')) {
    return ' If you are testing on a physical phone, set EXPO_PUBLIC_API_BASE_URL to your computer LAN IP and restart Expo.';
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

export const hasApiBaseUrl = Boolean(API_BASE_URL);

function assertApiConfigured() {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }
}

async function requestJson(path, options = {}) {
  const { authToken, body, method = 'POST' } = options;
  const headers = {
    'Content-Type': 'application/json',
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const reachabilityHint = buildReachabilityHint(API_BASE_URL);

    if (error.name === 'AbortError') {
      throw new Error(`The API request timed out while reaching ${API_BASE_URL}.${reachabilityHint}`);
    }

    throw new Error(`Unable to reach the API at ${API_BASE_URL}.${reachabilityHint}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const payload = await response.text();
    let message = payload || `Request failed with ${response.status}`;

    try {
      const parsed = JSON.parse(payload);
      message = parsed.message || message;
    } catch (_error) {
      // Leave the raw response text as the fallback message.
    }

    const requestError = new Error(message);
    requestError.statusCode = response.status;
    throw requestError;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function requestOtp(phone) {
  assertApiConfigured();

  return requestJson('/api/auth/request-otp', {
    body: { phone },
  });
}

export async function verifyOtp(phone, code) {
  assertApiConfigured();

  return requestJson('/api/auth/verify-otp', {
    body: { phone, code },
  });
}

export async function fetchSession(authToken) {
  assertApiConfigured();

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

export async function updateMyProfile(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/me/profile', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function previewRideMatches(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/ride-requests/preview-match', {
    authToken,
    body: payload,
  });
}

export async function searchPlaces(query, options = {}) {
  const trimmedQuery = String(query || '').trim();

  if (!trimmedQuery) {
    return { items: [] };
  }

  assertApiConfigured();

  const params = new URLSearchParams({
    q: trimmedQuery,
  });

  if (options.focusPoint?.latitude != null && options.focusPoint?.longitude != null) {
    params.set('lat', String(options.focusPoint.latitude));
    params.set('lng', String(options.focusPoint.longitude));
  }

  return requestJson(`/api/maps/autocomplete?${params.toString()}`, {
    method: 'GET',
  });
}

export async function fetchRoutePreview(payload) {
  assertApiConfigured();

  return requestJson('/api/maps/route', {
    body: payload,
  });
}

export async function fetchBookingQuote(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/bookings/quote', {
    authToken,
    body: payload,
  });
}

export async function confirmRideBooking(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/bookings', {
    authToken,
    body: payload,
  });
}

export async function fetchBookingDetails(bookingId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/bookings/${bookingId}`, {
    authToken,
    method: 'GET',
  });
}

export async function fetchMyBookings(authToken) {
  assertApiConfigured();

  return requestJson('/api/me/bookings', {
    authToken,
    method: 'GET',
  });
}

export async function cancelRideBooking(bookingId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/bookings/${bookingId}/cancel`, {
    authToken,
    method: 'PATCH',
  });
}

export async function fetchDriverTrips(authToken) {
  assertApiConfigured();

  return requestJson('/api/driver/me/trips', {
    authToken,
    method: 'GET',
  });
}

export async function updateDriverSettings(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/driver/me/settings', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function updateDriverTripStatus(bookingId, status, authToken) {
  assertApiConfigured();

  return requestJson(`/api/driver/bookings/${bookingId}/status`, {
    authToken,
    body: { status },
    method: 'PATCH',
  });
}

export async function acceptDriverRequest(requestId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/driver/requests/${requestId}/accept`, {
    authToken,
    method: 'POST',
  });
}

export async function updateDriverLocation(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/driver/me/location', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function fetchSavedPlaces(authToken) {
  assertApiConfigured();

  return requestJson('/api/me/saved-places', {
    authToken,
    method: 'GET',
  });
}

export async function createSavedPlace(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/me/saved-places', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function updateSavedPlace(placeId, payload, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/saved-places/${placeId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function deleteSavedPlace(placeId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/saved-places/${placeId}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function fetchPaymentMethods(authToken) {
  assertApiConfigured();

  return requestJson('/api/me/payment-methods', {
    authToken,
    method: 'GET',
  });
}

export async function createPaymentMethod(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/me/payment-methods', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function updatePaymentMethod(methodId, payload, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/payment-methods/${methodId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function deletePaymentMethod(methodId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/payment-methods/${methodId}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function fetchEmergencyContacts(authToken) {
  assertApiConfigured();

  return requestJson('/api/me/emergency-contacts', {
    authToken,
    method: 'GET',
  });
}

export async function createEmergencyContact(payload, authToken) {
  assertApiConfigured();

  return requestJson('/api/me/emergency-contacts', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function updateEmergencyContact(contactId, payload, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/emergency-contacts/${contactId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function deleteEmergencyContact(contactId, authToken) {
  assertApiConfigured();

  return requestJson(`/api/me/emergency-contacts/${contactId}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function fetchProfileSummary(authToken) {
  assertApiConfigured();

  return requestJson('/api/me/profile-summary', {
    authToken,
    method: 'GET',
  });
}

export function subscribeToBookingUpdates(bookingId, authToken, handlers = {}) {
  if (!bookingId || !authToken || !API_BASE_URL || typeof EventSource === 'undefined') {
    return null;
  }

  const encodedBookingId = encodeURIComponent(bookingId);
  const encodedToken = encodeURIComponent(authToken);
  const source = new EventSource(
    `${API_BASE_URL}/api/bookings/${encodedBookingId}/stream?access_token=${encodedToken}`
  );

  source.addEventListener('booking', (event) => {
    try {
      handlers.onBooking?.(JSON.parse(event.data));
    } catch (error) {
      handlers.onError?.(error);
    }
  });
  source.addEventListener('error', (event) => {
    handlers.onError?.(event);
  });

  return () => {
    source.close();
  };
}
