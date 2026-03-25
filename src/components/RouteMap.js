import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Car, MapPin } from 'lucide-react-native';
import Constants from 'expo-constants';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';

function getMapLibreModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo'
  ) {
    return null;
  }

  try {
    const module = require('@maplibre/maplibre-react-native');

    if (!module?.MapView || !module?.Camera || !module?.ShapeSource) {
      return null;
    }

    return module;
  } catch (_error) {
    return null;
  }
}

function buildLineGeometry(pickupLocation, dropoffLocation, routeGeometry) {
  if (routeGeometry?.type === 'LineString' && Array.isArray(routeGeometry.coordinates)) {
    return routeGeometry;
  }

  if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
    return null;
  }

  const { latitude: pickupLat, longitude: pickupLng } = pickupLocation.coordinates;
  const { latitude: dropoffLat, longitude: dropoffLng } = dropoffLocation.coordinates;
  const midpointLatitude = Number((((pickupLat + dropoffLat) / 2) + 0.018).toFixed(6));
  const midpointLongitude = Number(((pickupLng + dropoffLng) / 2).toFixed(6));

  return {
    type: 'LineString',
    coordinates: [
      [pickupLng, pickupLat],
      [midpointLongitude, midpointLatitude],
      [dropoffLng, dropoffLat],
    ],
  };
}

function buildCenterCoordinate(pickupLocation, dropoffLocation) {
  if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
    return [77.2167, 28.6315];
  }

  return [
    (pickupLocation.coordinates.longitude + dropoffLocation.coordinates.longitude) / 2,
    (pickupLocation.coordinates.latitude + dropoffLocation.coordinates.latitude) / 2,
  ];
}

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export default function RouteMap({
  distanceLabel,
  dropoffLocation,
  pickupLocation,
  routeGeometry,
  style,
}) {
  const mapLibre = getMapLibreModule();
  const lineGeometry = useMemo(
    () => buildLineGeometry(pickupLocation, dropoffLocation, routeGeometry),
    [dropoffLocation, pickupLocation, routeGeometry]
  );
  const centerCoordinate = useMemo(
    () => buildCenterCoordinate(pickupLocation, dropoffLocation),
    [dropoffLocation, pickupLocation]
  );

  if (!mapLibre || !lineGeometry) {
    return (
      <View style={[styles.placeholder, style]}>
        <View style={styles.placeholderRoadHorizontal} />
        <View style={styles.placeholderRoadVertical} />
        <View style={styles.placeholderRoute} />
        <View style={styles.placeholderPickup}>
          <View style={[styles.markerDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.markerText}>Pickup</Text>
        </View>
        <View style={styles.placeholderDropoff}>
          <View style={[styles.markerDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.markerText}>Drop</Text>
        </View>
        <View style={styles.placeholderDriver}>
          <Car size={18} color={COLORS.primary} />
        </View>
        {distanceLabel ? (
          <View style={styles.distanceBadge}>
            <MapPin size={12} color={COLORS.primary} />
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const {
    Camera,
    CircleLayer,
    LineLayer,
    MapView,
    ShapeSource,
  } = mapLibre;

  const pointsFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      pickupLocation?.coordinates
        ? {
            type: 'Feature',
            properties: {
              kind: 'pickup',
            },
            geometry: {
              type: 'Point',
              coordinates: [
                pickupLocation.coordinates.longitude,
                pickupLocation.coordinates.latitude,
              ],
            },
          }
        : null,
      dropoffLocation?.coordinates
        ? {
            type: 'Feature',
            properties: {
              kind: 'dropoff',
            },
            geometry: {
              type: 'Point',
              coordinates: [
                dropoffLocation.coordinates.longitude,
                dropoffLocation.coordinates.latitude,
              ],
            },
          }
        : null,
    ].filter(Boolean),
  };

  return (
    <View style={[styles.mapShell, style]}>
      <MapView style={StyleSheet.absoluteFill} mapStyle={mapStyle}>
        <Camera
          animationMode="none"
          centerCoordinate={centerCoordinate}
          zoomLevel={11.2}
        />
        <ShapeSource
          id="route"
          shape={{
            type: 'Feature',
            properties: {},
            geometry: lineGeometry,
          }}
        >
          <LineLayer
            id="route-line"
            style={{
              lineColor: COLORS.primary,
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
              lineOpacity: 0.9,
            }}
          />
        </ShapeSource>
        <ShapeSource id="markers" shape={pointsFeatureCollection}>
          <CircleLayer
            id="marker-circles"
            style={{
              circleRadius: 6,
              circleStrokeWidth: 2,
              circleStrokeColor: COLORS.surface,
              circleColor: [
                'match',
                ['get', 'kind'],
                'pickup',
                COLORS.success,
                COLORS.error,
              ],
            }}
          />
        </ShapeSource>
      </MapView>
      {distanceLabel ? (
        <View style={styles.distanceBadge}>
          <MapPin size={12} color={COLORS.primary} />
          <Text style={styles.distanceText}>{distanceLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    overflow: 'hidden',
    backgroundColor: '#DDE7F0',
  },
  placeholder: {
    backgroundColor: '#E8ECF0',
    overflow: 'hidden',
  },
  placeholderRoadHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FFFFFF',
  },
  placeholderRoadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '46%',
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  placeholderRoute: {
    position: 'absolute',
    top: '42%',
    left: '16%',
    width: '68%',
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '12deg' }],
  },
  placeholderPickup: {
    position: 'absolute',
    top: '38%',
    left: '14%',
    alignItems: 'center',
  },
  placeholderDropoff: {
    position: 'absolute',
    top: '38%',
    right: '14%',
    alignItems: 'center',
  },
  placeholderDriver: {
    position: 'absolute',
    top: '44%',
    left: '46%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  markerText: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  distanceBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...SHADOWS.small,
  },
  distanceText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
});
