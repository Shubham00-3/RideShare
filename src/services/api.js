import {
  buildMockBooking,
  buildMockMatchResponse,
  buildMockPlaceResults,
  buildMockQuote,
  buildMockRoutePreview,
} from './mockBackend';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 8000;
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';
const allowMockFallbacks = process.env.EXPO_PUBLIC_ALLOW_DEV_MOCK_FALLBACKS === 'true';

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
export const apiBaseUrl = API_BASE_URL;

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
    if (allowMockFallbacks) {
      return buildMockMatchResponse(payload);
    }

    throw error;
  }
}

export async function searchPlaces(query, options = {}) {
  const trimmedQuery = String(query || '').trim();

  if (!trimmedQuery) {
    return { items: [] };
  }

  if (!API_BASE_URL) {
    return {
      items: buildMockPlaceResults(trimmedQuery),
    };
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
  });

  if (options.focusPoint?.latitude != null && options.focusPoint?.longitude != null) {
    params.set('lat', String(options.focusPoint.latitude));
    params.set('lng', String(options.focusPoint.longitude));
  }

  try {
    return await requestJson(`/api/maps/autocomplete?${params.toString()}`, {
      method: 'GET',
    });
  } catch (error) {
    if (!allowMockFallbacks) {
      throw error;
    }

    return {
      items: buildMockPlaceResults(trimmedQuery),
    };
  }
}

export async function fetchRoutePreview(payload) {
  if (!API_BASE_URL) {
    return buildMockRoutePreview(payload);
  }

  try {
    return await requestJson('/api/maps/route', {
      body: payload,
    });
  } catch (error) {
    if (!allowMockFallbacks) {
      throw error;
    }

    return buildMockRoutePreview(payload);
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
    throw error;
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
    throw error;
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

export async function cancelRideBooking(bookingId, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson(`/api/bookings/${bookingId}/cancel`, {
    authToken,
    method: 'PATCH',
  });
}

export async function fetchDriverTrips(authToken) {
  if (!API_BASE_URL) {
    return {
      items: [],
      summary: {
        activeTrips: 0,
        completedTrips: 0,
        earningsToday: 0,
      },
    };
  }

  return requestJson('/api/driver/me/trips', {
    authToken,
    method: 'GET',
  });
}

export async function updateDriverSettings(payload, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/driver/me/settings', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function updateDriverTripStatus(bookingId, status, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson(`/api/driver/bookings/${bookingId}/status`, {
    authToken,
    body: { status },
    method: 'PATCH',
  });
}

export async function acceptDriverRequest(requestId, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson(`/api/driver/requests/${requestId}/accept`, {
    authToken,
    method: 'POST',
  });
}

export async function updateDriverLocation(payload, authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/driver/me/location', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function fetchProfile(authToken) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  return requestJson('/api/me/profile', {
    authToken,
    method: 'GET',
  });
}

export async function updateProfile(payload, authToken) {
  return requestJson('/api/me/profile', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function fetchSavedPlaces(authToken) {
  return requestJson('/api/me/saved-places', {
    authToken,
    method: 'GET',
  });
}

export async function createSavedPlace(payload, authToken) {
  return requestJson('/api/me/saved-places', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function updateSavedPlace(placeId, payload, authToken) {
  return requestJson(`/api/me/saved-places/${placeId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function deleteSavedPlace(placeId, authToken) {
  return requestJson(`/api/me/saved-places/${placeId}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function fetchEmergencyContacts(authToken) {
  return requestJson('/api/me/emergency-contacts', {
    authToken,
    method: 'GET',
  });
}

export async function createEmergencyContact(payload, authToken) {
  return requestJson('/api/me/emergency-contacts', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function updateEmergencyContact(contactId, payload, authToken) {
  return requestJson(`/api/me/emergency-contacts/${contactId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function deleteEmergencyContact(contactId, authToken) {
  return requestJson(`/api/me/emergency-contacts/${contactId}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function fetchNotificationPreferences(authToken) {
  return requestJson('/api/me/notification-preferences', {
    authToken,
    method: 'GET',
  });
}

export async function updateNotificationPreferences(payload, authToken) {
  return requestJson('/api/me/notification-preferences', {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function registerPushToken(payload, authToken) {
  return requestJson('/api/me/push-tokens', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function deletePushToken(expoPushToken, authToken) {
  return requestJson(`/api/me/push-tokens/${encodeURIComponent(expoPushToken)}`, {
    authToken,
    method: 'DELETE',
  });
}

export async function shareBooking(bookingId, authToken) {
  return requestJson(`/api/bookings/${bookingId}/share`, {
    authToken,
    method: 'POST',
  });
}

export async function triggerBookingSos(bookingId, payload, authToken) {
  return requestJson(`/api/bookings/${bookingId}/sos`, {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function createSupportTicket(payload, authToken) {
  return requestJson('/api/support/tickets', {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function fetchMySupportTickets(authToken) {
  return requestJson('/api/me/support-tickets', {
    authToken,
    method: 'GET',
  });
}

export async function submitBookingRating(bookingId, payload, authToken) {
  return requestJson(`/api/bookings/${bookingId}/rating`, {
    authToken,
    body: payload,
    method: 'POST',
  });
}

export async function fetchMyRatings(authToken) {
  return requestJson('/api/me/ratings', {
    authToken,
    method: 'GET',
  });
}

export async function rescheduleRideBooking(bookingId, departureTime, authToken) {
  return requestJson(`/api/bookings/${bookingId}/schedule`, {
    authToken,
    body: {
      departureTime,
    },
    method: 'PATCH',
  });
}

export async function fetchAdminOverview(authToken) {
  return requestJson('/api/admin/overview', {
    authToken,
    method: 'GET',
  });
}

export async function fetchAdminUsers(authToken, query = '') {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';

  return requestJson(`/api/admin/users${suffix}`, {
    authToken,
    method: 'GET',
  });
}

export async function fetchAdminBookings(authToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';

  return requestJson(`/api/admin/bookings${suffix}`, {
    authToken,
    method: 'GET',
  });
}

export async function fetchAdminIncidents(authToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';

  return requestJson(`/api/admin/incidents${suffix}`, {
    authToken,
    method: 'GET',
  });
}

export async function updateAdminBooking(bookingId, payload, authToken) {
  return requestJson(`/api/admin/bookings/${bookingId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function updateAdminIncident(incidentId, payload, authToken) {
  return requestJson(`/api/admin/incidents/${incidentId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}

export async function updateAdminDriver(driverUserId, payload, authToken) {
  return requestJson(`/api/admin/drivers/${driverUserId}`, {
    authToken,
    body: payload,
    method: 'PATCH',
  });
}
