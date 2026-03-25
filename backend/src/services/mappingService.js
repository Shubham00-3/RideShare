const env = require('../config/env');
const KNOWN_PLACES = require('../data/knownPlaces');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function buildPlaceResult(place, source = 'fallback') {
  return {
    id: place.id,
    name: place.name,
    label: place.label,
    city: place.city,
    coordinates: {
      latitude: place.latitude,
      longitude: place.longitude,
    },
    source,
  };
}

function haversineDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scorePlaceMatch(place, query) {
  const normalizedPlace = normalizeText(`${place.name} ${place.label} ${place.city}`);

  if (!query) {
    return 0;
  }

  if (normalizedPlace === query) {
    return 100;
  }

  if (normalizedPlace.startsWith(query)) {
    return 85;
  }

  if (normalizedPlace.includes(query)) {
    return 70;
  }

  const queryTokens = query.split(/\s+/).filter(Boolean);
  return queryTokens.reduce((score, token) => {
    return normalizedPlace.includes(token) ? score + 10 : score;
  }, 0);
}

function findFallbackPlaces(query, focusPoint) {
  const normalizedQuery = normalizeText(query);
  const enriched = KNOWN_PLACES.map((place) => {
    const textScore = scorePlaceMatch(place, normalizedQuery);
    const focusScore =
      focusPoint && focusPoint.latitude != null && focusPoint.longitude != null
        ? Math.max(0, 25 - haversineDistanceKm(place, focusPoint))
        : 0;

    return {
      place,
      score: textScore + focusScore,
    };
  });

  return enriched
    .filter((entry) => (normalizedQuery ? entry.score > 0 : true))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((entry) => buildPlaceResult(entry.place));
}

function findFallbackPlaceByLabel(label) {
  const normalizedLabel = normalizeText(label);
  const exactMatch = KNOWN_PLACES.find((place) => normalizeText(place.label) === normalizedLabel);

  if (exactMatch) {
    return buildPlaceResult(exactMatch);
  }

  return findFallbackPlaces(label).at(0) || null;
}

function createRouteGeometry(from, to) {
  const midpointLongitude = Number(((from.longitude + to.longitude) / 2).toFixed(6));
  const midpointLatitude = Number((((from.latitude + to.latitude) / 2) + 0.018).toFixed(6));

  return {
    type: 'LineString',
    coordinates: [
      [from.longitude, from.latitude],
      [midpointLongitude, midpointLatitude],
      [to.longitude, to.latitude],
    ],
  };
}

function buildFallbackRoute({ pickup, dropoff }) {
  const distanceKm = Math.max(
    haversineDistanceKm(pickup.coordinates, dropoff.coordinates) * 1.24,
    1.2
  );
  const durationMinutes = Math.max(Math.round(distanceKm * 2.6), 8);

  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMinutes,
    durationSeconds: durationMinutes * 60,
    geometry: createRouteGeometry(pickup.coordinates, dropoff.coordinates),
    legs: [
      {
        summary: `${pickup.name} to ${dropoff.name}`,
      },
    ],
    source: 'fallback',
  };
}

function ensureCoordinatePayload(location, fallbackLabel) {
  const latitude = toNumber(location?.coordinates?.latitude ?? location?.latitude);
  const longitude = toNumber(location?.coordinates?.longitude ?? location?.longitude);
  const label = String(location?.label || location?.name || fallbackLabel || '').trim();

  if (latitude != null && longitude != null && label) {
    return {
      id: location?.id || null,
      name: location?.name || label.split(',')[0],
      label,
      coordinates: {
        latitude,
        longitude,
      },
    };
  }

  const fallbackPlace = findFallbackPlaceByLabel(label || fallbackLabel);

  if (fallbackPlace) {
    return fallbackPlace;
  }

  return null;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Mapping request failed with ${response.status}`);
  }

  return response.json();
}

function parsePeliasFeatures(features = []) {
  return features
    .filter((feature) => Array.isArray(feature.geometry?.coordinates))
    .map((feature, index) => ({
      id: feature.properties?.gid || `pelias_${index}`,
      name: feature.properties?.name || feature.properties?.label || 'Suggested place',
      label:
        feature.properties?.label ||
        feature.properties?.name ||
        `${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}`,
      city:
        feature.properties?.locality ||
        feature.properties?.region ||
        feature.properties?.country ||
        '',
      coordinates: {
        latitude: Number(feature.geometry.coordinates[1]),
        longitude: Number(feature.geometry.coordinates[0]),
      },
      source: 'pelias',
    }));
}

async function autocompletePlaces(query, options = {}) {
  const trimmedQuery = String(query || '').trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!env.peliasBaseUrl) {
    return findFallbackPlaces(trimmedQuery, options.focusPoint || null);
  }

  const url = new URL('/v1/autocomplete', env.peliasBaseUrl);
  url.searchParams.set('text', trimmedQuery);
  url.searchParams.set('size', '6');

  if (env.peliasApiKey) {
    url.searchParams.set('api_key', env.peliasApiKey);
  }

  if (options.focusPoint?.latitude != null && options.focusPoint?.longitude != null) {
    url.searchParams.set('focus.point.lat', String(options.focusPoint.latitude));
    url.searchParams.set('focus.point.lon', String(options.focusPoint.longitude));
  }

  try {
    const payload = await fetchJson(url.toString());
    const places = parsePeliasFeatures(payload.features);
    return places.length > 0 ? places : findFallbackPlaces(trimmedQuery, options.focusPoint || null);
  } catch (_error) {
    return findFallbackPlaces(trimmedQuery, options.focusPoint || null);
  }
}

async function buildRoutePreview({ pickup, dropoff }) {
  const normalizedPickup = ensureCoordinatePayload(pickup, pickup?.label);
  const normalizedDropoff = ensureCoordinatePayload(dropoff, dropoff?.label);

  if (!normalizedPickup || !normalizedDropoff) {
    throw new Error('Pickup and dropoff locations need coordinates for routing.');
  }

  if (!env.valhallaBaseUrl) {
    return buildFallbackRoute({
      pickup: normalizedPickup,
      dropoff: normalizedDropoff,
    });
  }

  const url = new URL('/route', env.valhallaBaseUrl);
  const payload = {
    locations: [
      {
        lat: normalizedPickup.coordinates.latitude,
        lon: normalizedPickup.coordinates.longitude,
      },
      {
        lat: normalizedDropoff.coordinates.latitude,
        lon: normalizedDropoff.coordinates.longitude,
      },
    ],
    costing: 'auto',
    directions_options: {
      units: 'kilometers',
    },
    shape_format: 'geojson',
  };

  try {
    const routeResponse = await fetchJson(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const leg = routeResponse.trip?.legs?.[0];
    const summary = routeResponse.trip?.summary || leg?.summary || {};

    return {
      distanceKm: Number((toNumber(summary.length) || 0).toFixed(1)),
      durationMinutes: Math.max(Math.round((toNumber(summary.time) || 0) / 60), 1),
      durationSeconds: Math.max(Math.round(toNumber(summary.time) || 0), 60),
      geometry: leg?.shape || createRouteGeometry(normalizedPickup.coordinates, normalizedDropoff.coordinates),
      legs: routeResponse.trip?.legs || [],
      source: 'valhalla',
    };
  } catch (_error) {
    return buildFallbackRoute({
      pickup: normalizedPickup,
      dropoff: normalizedDropoff,
    });
  }
}

module.exports = {
  autocompletePlaces,
  buildRoutePreview,
  ensureCoordinatePayload,
  findFallbackPlaceByLabel,
};
