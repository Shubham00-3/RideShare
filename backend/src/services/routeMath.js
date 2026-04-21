function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function haversineDistanceKm(from, to) {
  if (!from || !to) {
    return 0;
  }

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

function getLineCoordinates(geometry) {
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  return geometry.coordinates
    .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
    .map(([longitude, latitude]) => ({
      latitude: toNumber(latitude),
      longitude: toNumber(longitude),
    }));
}

function getLineDistanceKm(geometry) {
  const coordinates = getLineCoordinates(geometry);

  if (coordinates.length < 2) {
    return 0;
  }

  return coordinates.slice(1).reduce((distance, point, index) => {
    return distance + haversineDistanceKm(coordinates[index], point);
  }, 0);
}

function projectToKmPoint(point, referenceLatitude) {
  const latFactor = 111.32;
  const lonFactor = Math.cos((referenceLatitude * Math.PI) / 180) * 111.32;

  return {
    x: point.longitude * lonFactor,
    y: point.latitude * latFactor,
  };
}

function distancePointToSegmentKm(point, segmentStart, segmentEnd) {
  const referenceLatitude = (segmentStart.latitude + segmentEnd.latitude + point.latitude) / 3;
  const projectedPoint = projectToKmPoint(point, referenceLatitude);
  const projectedStart = projectToKmPoint(segmentStart, referenceLatitude);
  const projectedEnd = projectToKmPoint(segmentEnd, referenceLatitude);
  const dx = projectedEnd.x - projectedStart.x;
  const dy = projectedEnd.y - projectedStart.y;
  const denominator = dx * dx + dy * dy;

  if (denominator === 0) {
    return Math.hypot(projectedPoint.x - projectedStart.x, projectedPoint.y - projectedStart.y);
  }

  const t = clamp(
    ((projectedPoint.x - projectedStart.x) * dx + (projectedPoint.y - projectedStart.y) * dy) /
      denominator,
    0,
    1
  );
  const nearestX = projectedStart.x + dx * t;
  const nearestY = projectedStart.y + dy * t;

  return Math.hypot(projectedPoint.x - nearestX, projectedPoint.y - nearestY);
}

function getPointAtLineProgress(geometry, progress) {
  const coordinates = getLineCoordinates(geometry);

  if (coordinates.length === 0) {
    return null;
  }

  if (coordinates.length === 1) {
    return coordinates[0];
  }

  const targetProgress = clamp(progress, 0, 1);
  const totalDistanceKm = getLineDistanceKm(geometry);

  if (totalDistanceKm <= 0) {
    return coordinates[0];
  }

  const targetDistanceKm = totalDistanceKm * targetProgress;
  let traversedKm = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previousPoint = coordinates[index - 1];
    const nextPoint = coordinates[index];
    const segmentDistanceKm = haversineDistanceKm(previousPoint, nextPoint);

    if (traversedKm + segmentDistanceKm >= targetDistanceKm) {
      const remainingKm = targetDistanceKm - traversedKm;
      const segmentProgress = segmentDistanceKm > 0 ? remainingKm / segmentDistanceKm : 0;

      return {
        latitude:
          previousPoint.latitude + (nextPoint.latitude - previousPoint.latitude) * segmentProgress,
        longitude:
          previousPoint.longitude +
          (nextPoint.longitude - previousPoint.longitude) * segmentProgress,
      };
    }

    traversedKm += segmentDistanceKm;
  }

  return coordinates.at(-1);
}

function getRouteProgressFromLocation(geometry, location) {
  const coordinates = getLineCoordinates(geometry);

  if (coordinates.length < 2 || !location) {
    return null;
  }

  const routeDistanceKm = getLineDistanceKm(geometry);

  if (routeDistanceKm <= 0) {
    return null;
  }

  let bestMatch = null;
  let traversedKm = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const segmentStart = coordinates[index - 1];
    const segmentEnd = coordinates[index];
    const referenceLatitude = (segmentStart.latitude + segmentEnd.latitude + location.latitude) / 3;
    const projectedLocation = projectToKmPoint(location, referenceLatitude);
    const projectedStart = projectToKmPoint(segmentStart, referenceLatitude);
    const projectedEnd = projectToKmPoint(segmentEnd, referenceLatitude);
    const dx = projectedEnd.x - projectedStart.x;
    const dy = projectedEnd.y - projectedStart.y;
    const denominator = dx * dx + dy * dy;
    const rawT =
      denominator === 0
        ? 0
        : ((projectedLocation.x - projectedStart.x) * dx +
            (projectedLocation.y - projectedStart.y) * dy) /
          denominator;
    const t = clamp(rawT, 0, 1);
    const nearestX = projectedStart.x + dx * t;
    const nearestY = projectedStart.y + dy * t;
    const distanceKm = Math.hypot(projectedLocation.x - nearestX, projectedLocation.y - nearestY);
    const segmentDistanceKm = haversineDistanceKm(segmentStart, segmentEnd);
    const routeProgress = clamp(
      (traversedKm + segmentDistanceKm * t) / routeDistanceKm,
      0,
      1
    );

    if (!bestMatch || distanceKm < bestMatch.distanceKm) {
      bestMatch = {
        distanceKm,
        progress: routeProgress,
      };
    }

    traversedKm += segmentDistanceKm;
  }

  return bestMatch;
}

function getGeometryOverlapScore({
  requestDistanceKm,
  requestGeometry,
  candidateGeometry,
  thresholdKm = 1.2,
}) {
  const requestCoordinates = getLineCoordinates(requestGeometry);
  const candidateCoordinates = getLineCoordinates(candidateGeometry);

  if (requestCoordinates.length < 2 || candidateCoordinates.length < 2) {
    return null;
  }

  let matchedSamples = 0;

  for (const point of requestCoordinates) {
    let minDistanceKm = Number.POSITIVE_INFINITY;

    for (let index = 1; index < candidateCoordinates.length; index += 1) {
      const distanceKm = distancePointToSegmentKm(
        point,
        candidateCoordinates[index - 1],
        candidateCoordinates[index]
      );

      if (distanceKm < minDistanceKm) {
        minDistanceKm = distanceKm;
      }
    }

    if (minDistanceKm <= thresholdKm) {
      matchedSamples += 1;
    }
  }

  const overlapRatio = clamp(matchedSamples / requestCoordinates.length, 0, 1);
  const overlapKm = Number((toNumber(requestDistanceKm) * overlapRatio).toFixed(1));

  return {
    overlapKm,
    overlapRatio: Number(overlapRatio.toFixed(2)),
  };
}

module.exports = {
  clamp,
  getGeometryOverlapScore,
  getLineCoordinates,
  getLineDistanceKm,
  getPointAtLineProgress,
  getRouteProgressFromLocation,
  haversineDistanceKm,
  toNumber,
};
