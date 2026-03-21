import {
  buildMockBooking,
  buildMockMatchResponse,
  buildMockQuote,
} from './mockBackend';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function requestJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function previewRideMatches(payload) {
  if (!API_BASE_URL) {
    return buildMockMatchResponse(payload);
  }

  try {
    return await requestJson('/api/ride-requests/preview-match', payload);
  } catch (error) {
    return buildMockMatchResponse(payload);
  }
}

export async function fetchBookingQuote(payload) {
  if (!API_BASE_URL) {
    return buildMockQuote(payload);
  }

  try {
    return await requestJson('/api/bookings/quote', payload);
  } catch (error) {
    return buildMockQuote(payload);
  }
}

export async function confirmRideBooking(payload) {
  if (!API_BASE_URL) {
    return buildMockBooking(payload);
  }

  try {
    return await requestJson('/api/bookings', payload);
  } catch (error) {
    return buildMockBooking(payload);
  }
}
