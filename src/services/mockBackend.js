import { MOCK_MATCHES, MOCK_VEHICLES, USER_PROFILE } from '../constants/data';

const MOCK_PLACES = [
  {
    id: 'connaught_place',
    name: 'Connaught Place',
    label: 'Connaught Place, New Delhi',
    city: 'New Delhi',
    coordinates: { latitude: 28.6315, longitude: 77.2167 },
  },
  {
    id: 'akshardham_temple',
    name: 'Akshardham Temple',
    label: 'Akshardham Temple, Delhi',
    city: 'Delhi',
    coordinates: { latitude: 28.6127, longitude: 77.2773 },
  },
  {
    id: 'rajiv_chowk',
    name: 'Rajiv Chowk Metro Station',
    label: 'Rajiv Chowk Metro Station, New Delhi',
    city: 'New Delhi',
    coordinates: { latitude: 28.6328, longitude: 77.2197 },
  },
  {
    id: 'india_gate',
    name: 'India Gate',
    label: 'India Gate, New Delhi',
    city: 'New Delhi',
    coordinates: { latitude: 28.6129, longitude: 77.2295 },
  },
  {
    id: 'cyber_city',
    name: 'DLF Cyber City',
    label: 'DLF Cyber City, Gurgaon',
    city: 'Gurgaon',
    coordinates: { latitude: 28.4959, longitude: 77.0891 },
  },
  {
    id: 'noida_sector_62',
    name: 'Sector 62',
    label: 'Sector 62, Noida',
    city: 'Noida',
    coordinates: { latitude: 28.627, longitude: 77.3649 },
  },
  {
    id: 'noida_sector_18',
    name: 'Sector 18',
    label: 'Sector 18, Noida',
    city: 'Noida',
    coordinates: { latitude: 28.5707, longitude: 77.3272 },
  },
];

function rupees(value) {
  return `₹${Math.round(value)}`;
}

function toNumber(currencyString) {
  return Number(String(currencyString).replace(/[^\d.]/g, '')) || 0;
}

function normalizeLocation(value, fallback) {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function inferCorridor(pickup, dropoff) {
  return `${pickup.split(',')[0].trim()} -> ${dropoff.split(',')[0].trim()}`;
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

function buildRouteGeometry(pickup, dropoff) {
  const midpointLatitude = Number((((pickup.latitude + dropoff.latitude) / 2) + 0.018).toFixed(6));
  const midpointLongitude = Number(((pickup.longitude + dropoff.longitude) / 2).toFixed(6));

  return {
    type: 'LineString',
    coordinates: [
      [pickup.longitude, pickup.latitude],
      [midpointLongitude, midpointLatitude],
      [dropoff.longitude, dropoff.latitude],
    ],
  };
}

function buildVehicleOptions(match, rideType) {
  const sharedBias = rideType === 'shared' ? 0.94 : 1.08;

  return MOCK_VEHICLES.map((vehicle, index) => {
    const fare = Math.round(toNumber(vehicle.fare) * sharedBias + index * 12);
    return {
      ...vehicle,
      id: `${match.id}-${vehicle.id}`,
      fare: rupees(fare),
      fareValue: fare,
      seatsAvailable: vehicle.seats,
      matchId: match.id,
      providerVehicleId: `veh_${match.id}_${vehicle.id}`,
    };
  });
}

export function buildMockMatchResponse(payload = {}) {
  const pickup = normalizeLocation(payload.pickup, 'Connaught Place, New Delhi');
  const dropoff = normalizeLocation(payload.dropoff, 'Akshardham Temple, Delhi');
  const rideType = payload.rideType || 'shared';
  const requestDistanceKm = payload.route?.distanceKm || 15;
  const requestDurationMinutes = payload.route?.durationMinutes || 35;

  const request = {
    id: `req_${Date.now()}`,
    pickup,
    dropoff,
    pickupLocation: payload.pickupLocation || null,
    dropoffLocation: payload.dropoffLocation || null,
    rideType,
    seatsRequired: payload.seatsRequired || 1,
    allowMidTripPickup: payload.allowMidTripPickup ?? true,
    departureTime: payload.departureTime || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    distanceKm: requestDistanceKm,
    durationMinutes: requestDurationMinutes,
    route: payload.route || null,
    corridorLabel: inferCorridor(pickup, dropoff),
  };

  const matches = MOCK_MATCHES.map((match, index) => {
    const overlapRatio = match.overlap / 100;
    const vehicles = buildVehicleOptions(match, rideType);
    const soloFareValue = toNumber(match.soloFare);
    const sharedFareValue = Math.round(soloFareValue * (1 - overlapRatio * 0.35));
    const fareDelta = Math.max(soloFareValue - sharedFareValue, 80);

    return {
      ...match,
      id: `match_${match.id}`,
      requestId: request.id,
      routeLabel: `${pickup.split(',')[0]} -> ${dropoff.split(',')[0]}`,
      overlapRatio,
      overlapKm: Number((requestDistanceKm * overlapRatio).toFixed(1)),
      sharedFare: rupees(sharedFareValue),
      sharedFareValue,
      soloFare: rupees(soloFareValue),
      soloFareValue,
      savings: rupees(fareDelta),
      savingsValue: fareDelta,
      detourMinutes: Number(match.detour.replace(/[^\d.]/g, '')) || 5,
      score: Number((overlapRatio * 100 - index * 4).toFixed(1)),
      vehicles,
      driverPoolHeadline:
        rideType === 'shared'
          ? 'Driver earns more on this pooled route'
          : 'Solo trip with optional mid-trip pooling',
    };
  });

  return {
    request,
    matches,
    source: 'mock',
  };
}

export function buildMockQuote({ request, match, vehicle, options }) {
  const insurance = options?.insurance ?? true;
  const allowMidTripPickup = options?.allowMidTripPickup ?? true;
  const distanceFare = Math.max(Math.round((vehicle.fareValue || toNumber(vehicle.fare)) * 0.62), 120);
  const baseFare = Math.max(Math.round(request.distanceKm * 8), 100);
  const platformFee = 20;
  const poolingDiscount = match.savingsValue ? Math.round(match.savingsValue * 0.22) : 40;
  const midTripPickupDiscount = allowMidTripPickup ? 18 : 0;
  const insuranceFee = insurance ? 15 : 0;
  const subtotal = baseFare + distanceFare + platformFee + insuranceFee;
  const total = subtotal - poolingDiscount - midTripPickupDiscount;

  return {
    requestId: request.id,
    matchId: match.id,
    vehicleId: vehicle.providerVehicleId,
    breakdown: {
      baseFare,
      distanceFare,
      platformFee,
      poolingDiscount,
      midTripPickupDiscount,
      insuranceFee,
    },
    totals: {
      total,
      soloReferenceFare: match.soloFareValue,
      estimatedSavings: Math.max(match.soloFareValue - total, 0),
    },
  };
}

export function buildMockBooking({ request, match, vehicle, quote, options }) {
  const now = Date.now();
  const driverName = vehicle.driver?.name || match.passenger?.name || 'Assigned driver';
  const etaMinutes = Number(String(vehicle.eta || match.eta || '4').replace(/[^\d.]/g, '')) || 4;

  return {
    bookingId: `booking_${now}`,
    status: 'confirmed',
    source: 'mock',
    trip: {
      id: `trip_${now}`,
      status: 'driver_arriving',
      pickup: request.pickup,
      dropoff: request.dropoff,
      pickupLocation: request.pickupLocation || null,
      dropoffLocation: request.dropoffLocation || null,
      rideType: request.rideType,
      allowMidTripPickup: options?.allowMidTripPickup ?? true,
      etaMinutes,
      durationMinutes: request.durationMinutes,
      distanceKm: request.distanceKm,
      routeGeometry: request.route?.geometry || null,
      routeDurationSeconds: request.route?.durationSeconds || request.durationMinutes * 60,
      routeDistanceMeters: request.route?.distanceKm
        ? Math.round(request.route.distanceKm * 1000)
        : Math.round(request.distanceKm * 1000),
      fareTotal: quote.totals.total,
      fareSavings: quote.totals.estimatedSavings,
      routeLabel: `${request.pickup.split(',')[0]} -> ${request.dropoff.split(',')[0]}`,
      vehicle: {
        name: vehicle.name,
        type: vehicle.type,
        color: 'White',
        plateNumber: 'DL 01 AB 1234',
      },
      driver: {
        name: driverName,
        rating: vehicle.driver?.rating || 4.9,
        trips: vehicle.driver?.trips || 1000,
        phone: '+91 99999 11111',
      },
      rider: {
        name: USER_PROFILE.name,
        phone: USER_PROFILE.phone,
      },
      midTripOffer: options?.allowMidTripPickup
        ? {
            title: 'New rider joining in 3 min!',
            discount: 40,
          }
        : null,
    },
  };
}

export function buildMockPlaceResults(query) {
  const normalizedQuery = normalizeLocation(query, '').toLowerCase();

  return MOCK_PLACES.filter((place) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${place.name} ${place.label} ${place.city}`.toLowerCase().includes(normalizedQuery);
  }).slice(0, 6);
}

export function buildMockRoutePreview({ pickup, dropoff }) {
  const fallbackPickup = pickup || MOCK_PLACES[0];
  const fallbackDropoff = dropoff || MOCK_PLACES[1];
  const distanceKm = Number(
    Math.max(
      haversineDistanceKm(fallbackPickup.coordinates, fallbackDropoff.coordinates) * 1.24,
      1.2
    ).toFixed(1)
  );
  const durationMinutes = Math.max(Math.round(distanceKm * 2.6), 8);

  return {
    distanceKm,
    durationMinutes,
    durationSeconds: durationMinutes * 60,
    geometry: buildRouteGeometry(fallbackPickup.coordinates, fallbackDropoff.coordinates),
    source: 'mock',
  };
}
