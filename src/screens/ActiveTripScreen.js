import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  Car,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  Users,
  X,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useRide } from '../context/RideContext';
import RouteMap from '../components/RouteMap';

const { height } = Dimensions.get('window');
const LIVE_REFRESH_MS = 5000;

export default function ActiveTripScreen({ navigation }) {
  const {
    activeBookingId,
    activeBookingSource,
    activeTripConnection,
    activeTrip,
    cancelBooking,
    loading,
    refreshActiveBooking,
  } = useRide();
  const [showMidTripAlert, setShowMidTripAlert] = useState(false);
  const [dismissedOfferKey, setDismissedOfferKey] = useState(null);
  const [localTripProgress, setLocalTripProgress] = useState(0.2);
  const pulseAnim = useState(new Animated.Value(1))[0];
  const isBackendBackedTrip = Boolean(activeBookingId && activeBookingSource === 'api');
  const activeOfferKey = activeTrip?.midTripOffer
    ? `${activeTrip.id}:${activeTrip.midTripOffer.title}`
    : null;

  useEffect(() => {
    if (!isBackendBackedTrip || activeTripConnection === 'streaming') {
      return undefined;
    }

    const refreshTrip = () => {
      refreshActiveBooking().catch(() => {
        // Keep the last known trip state on screen if refresh fails.
      });
    };

    refreshTrip();
    const interval = setInterval(refreshTrip, LIVE_REFRESH_MS);

    return () => {
      clearInterval(interval);
    };
  }, [activeTripConnection, isBackendBackedTrip, refreshActiveBooking]);

  useEffect(() => {
    if (isBackendBackedTrip || !activeTrip) {
      return undefined;
    }

    const interval = setInterval(() => {
      setLocalTripProgress((previous) => {
        if (previous >= 0.92) {
          clearInterval(interval);
          return 0.92;
        }

        return previous + 0.05;
      });
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTrip, isBackendBackedTrip]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (!activeOfferKey) {
      setShowMidTripAlert(false);
      return;
    }

    if (dismissedOfferKey !== activeOfferKey) {
      setShowMidTripAlert(true);
    }
  }, [activeOfferKey, dismissedOfferKey]);

  if (!activeTrip) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No active trip yet</Text>
        <Text style={styles.emptySubtitle}>Book a matched ride first to see live trip state here.</Text>
      </View>
    );
  }

  const tripProgress =
    isBackendBackedTrip && typeof activeTrip.progress === 'number'
      ? activeTrip.progress
      : localTripProgress;
  const isScheduledRide = String(activeTrip.status || '') === 'scheduled';
  const kmLeft =
    typeof activeTrip.remainingDistanceKm === 'number'
      ? Math.max(Math.round(activeTrip.remainingDistanceKm), 0)
      : Math.max(Math.round((1 - tripProgress) * activeTrip.distanceKm), 1);
  const etaLeft =
    typeof activeTrip.etaMinutes === 'number'
      ? Math.max(activeTrip.etaMinutes, 0)
      : Math.max(Math.round((1 - tripProgress) * activeTrip.durationMinutes), 3);
  const tripTitle =
    activeTrip.phaseLabel ||
    (activeTrip.status === 'completed' ? 'Trip completed' : 'Trip in progress');
  const liveUpdateText =
    activeTripConnection === 'streaming'
      ? 'Live stream connected'
      : isBackendBackedTrip
        ? `Live fallback refresh every ${LIVE_REFRESH_MS / 1000}s`
        : 'Demo trip simulation';
  const progressText = isScheduledRide
    ? `${etaLeft} min until pickup window`
    : `${Math.round(tripProgress * 100)}% complete`;
  const canCancelRide = !['completed', 'cancelled'].includes(String(activeTrip.status || '').toLowerCase());

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <RouteMap
          style={styles.mapPlaceholder}
          currentLocation={activeTrip.currentLocation}
          pickupLocation={activeTrip.pickupLocation}
          dropoffLocation={activeTrip.dropoffLocation}
          routeGeometry={activeTrip.routeGeometry}
          distanceLabel={`${kmLeft} km left`}
        />

        <View style={styles.routePath}>
          <View style={[styles.routeFilled, { width: `${tripProgress * 100}%` }]} />
        </View>

        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => navigation.goBack()}>
            <X size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.etaBadge}>
            <Clock size={14} color={COLORS.primary} />
            <Text style={styles.etaText}>{etaLeft} min</Text>
          </View>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={styles.controlText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, { marginTop: 8 }]}>
            <Navigation size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {showMidTripAlert && activeTrip.midTripOffer ? (
        <View style={styles.midTripAlert}>
          <View style={styles.alertIcon}>
            <Bell size={16} color={COLORS.textInverse} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{activeTrip.midTripOffer.title}</Text>
            <Text style={styles.alertSubtitle}>
              Your fare reduces by Rs. {activeTrip.midTripOffer.discount}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setDismissedOfferKey(activeOfferKey);
              setShowMidTripAlert(false);
            }}
          >
            <X size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${tripProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>

        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripTitle}>{tripTitle}</Text>
            <Text style={styles.tripSubtitle}>{liveUpdateText}</Text>
          </View>
          <View style={styles.rideBadge}>
            <Users size={12} color={COLORS.success} />
            <Text style={styles.rideType}>{activeTrip.rideType === 'solo' ? 'Solo' : 'Shared Ride'}</Text>
          </View>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{activeTrip.driver.name.charAt(0)}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{activeTrip.driver.name}</Text>
            <View style={styles.driverMeta}>
              <Star size={12} color={COLORS.star} fill={COLORS.star} />
              <Text style={styles.driverRating}>{activeTrip.driver.rating}</Text>
              <Text style={styles.driverTrips}>| {activeTrip.driver.trips} trips</Text>
            </View>
            {activeTrip.driver.phone ? (
              <Text style={styles.driverPhone}>Test driver login: {activeTrip.driver.phone.replace('+91', '')}</Text>
            ) : null}
          </View>
          <View style={styles.plateNumber}>
            <Text style={styles.plateText}>{activeTrip.vehicle.plateNumber}</Text>
          </View>
        </View>

        <View style={styles.vehicleRoute}>
          <View style={styles.vehicleBadge}>
            <Car size={14} color={COLORS.primary} />
            <Text style={styles.vehicleText}>
              {activeTrip.vehicle.name} | {activeTrip.vehicle.color}
            </Text>
          </View>
          <View style={styles.routeInfo}>
            <MapPin size={14} color={COLORS.success} />
            <Text style={styles.routeText} numberOfLines={1}>
              {activeTrip.nextStopLabel || activeTrip.routeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Current trip economics</Text>
          <Text style={styles.earningsLine}>Fare paid: Rs. {activeTrip.fareTotal}</Text>
          <Text style={styles.earningsLine}>Savings unlocked: Rs. {activeTrip.fareSavings}</Text>
        </View>

        {canCancelRide ? (
          <TouchableOpacity
            style={styles.cancelButton}
            disabled={loading}
            onPress={() => {
              Alert.alert(
                'Cancel this ride?',
                'This will cancel the trip for you and update the booking status immediately.',
                [
                  { text: 'Keep ride', style: 'cancel' },
                  {
                    text: 'Cancel ride',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await cancelBooking(activeBookingId);
                        navigation.navigate('MainTabs');
                      } catch (cancelError) {
                        Alert.alert(
                          'Cancellation unavailable',
                          cancelError.message || 'We could not cancel the ride right now.'
                        );
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>
              {loading ? 'Cancelling...' : 'Cancel ride'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Phone size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MessageCircle size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Navigation size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('SOS')}>
              <AlertTriangle size={20} color={COLORS.textInverse} />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
    ...FONTS.regular,
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8ECF0',
    position: 'relative',
    overflow: 'hidden',
  },
  routePath: {
    position: 'absolute',
    top: '47%',
    left: '15%',
    width: '70%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  routeFilled: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  topControls: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  etaText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  controlText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    ...FONTS.bold,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 120,
  },
  midTripAlert: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  alertSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 3,
    ...FONTS.regular,
  },
  bottomSheet: {
    minHeight: height * 0.4,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.textSecondary,
    marginTop: 8,
    ...FONTS.medium,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  tripSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    ...FONTS.regular,
  },
  rideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: `${COLORS.success}16`,
  },
  rideType: {
    color: COLORS.success,
    ...FONTS.semiBold,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    padding: 14,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}16`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    color: COLORS.primary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  driverRating: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  driverTrips: {
    color: COLORS.textTertiary,
    ...FONTS.medium,
  },
  driverPhone: {
    color: COLORS.primary,
    marginTop: 6,
    ...FONTS.semiBold,
  },
  plateNumber: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.surface,
  },
  plateText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  vehicleRoute: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  vehicleBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFF',
    borderRadius: SIZES.radius_lg,
    padding: 12,
  },
  vehicleText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5FFF8',
    borderRadius: SIZES.radius_lg,
    padding: 12,
  },
  routeText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  earningsCard: {
    marginTop: 14,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    padding: 14,
  },
  earningsTitle: {
    color: COLORS.textPrimary,
    marginBottom: 8,
    ...FONTS.semiBold,
  },
  earningsLine: {
    color: COLORS.textSecondary,
    marginTop: 2,
    ...FONTS.medium,
  },
  cancelButton: {
    marginTop: 14,
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    color: COLORS.error,
    ...FONTS.semiBold,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionBtn: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    gap: 6,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  sosButton: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    gap: 6,
  },
  sosText: {
    color: COLORS.textInverse,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
});
