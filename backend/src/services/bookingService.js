function calculateQuote({ request, match, vehicle, options = {} }) {
  const insurance = options.insurance ?? true;
  const allowMidTripPickup = options.allowMidTripPickup ?? true;
  const baseFare = Math.max(Math.round(request.distanceKm * 8), 100);
  const distanceFare = Math.max(Math.round((vehicle.fareValue || 0) * 0.64), 120);
  const platformFee = 20;
  const insuranceFee = insurance ? 15 : 0;
  const poolingDiscount = Math.max(Math.round((match.savingsValue || 80) * 0.2), 35);
  const midTripPickupDiscount = allowMidTripPickup ? 18 : 0;
  const total =
    baseFare +
    distanceFare +
    platformFee +
    insuranceFee -
    poolingDiscount -
    midTripPickupDiscount;

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

function confirmBooking({ request, match, vehicle, quote, options = {} }) {
  const createdAt = Date.now();
  const etaMinutes =
    Number(String(vehicle.eta || '4').replace(/[^\d.]/g, '')) || 4;

  return {
    bookingId: `booking_${createdAt}`,
    status: 'confirmed',
    trip: {
      id: `trip_${createdAt}`,
      status: 'driver_arriving',
      pickup: request.pickup,
      dropoff: request.dropoff,
      routeLabel: `${request.pickup.split(',')[0]} -> ${request.dropoff.split(',')[0]}`,
      rideType: request.rideType,
      allowMidTripPickup: options.allowMidTripPickup ?? true,
      etaMinutes,
      durationMinutes: request.durationMinutes,
      distanceKm: request.distanceKm,
      fareTotal: quote.totals.total,
      fareSavings: quote.totals.estimatedSavings,
      vehicle: {
        name: vehicle.name,
        type: vehicle.type,
        color: 'White',
        plateNumber: 'DL 01 AB 1234',
      },
      driver: {
        name: vehicle.driver.name,
        rating: vehicle.driver.rating,
        trips: vehicle.driver.trips,
        phone: '+91 99999 11111',
      },
      midTripOffer:
        options.allowMidTripPickup ?? true
          ? {
              title: 'New rider joining in 3 min!',
              discount: 40,
            }
          : null,
    },
  };
}

module.exports = {
  calculateQuote,
  confirmBooking,
};
