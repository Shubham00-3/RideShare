import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Share,
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
  Share2,
  Star,
  Users,
  X,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useRide } from '../context/RideContext';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import RouteMap from '../components/RouteMap';
import { shareBooking } from '../services/api';

const { height } = Dimensions.get('window');
const LIVE_REFRESH_MS = 5000;

export default function ActiveTripScreen({ navigation }) {
  const { token } = useAuth();
  const { isConnected, watchBooking, watchTrip } = useRealtime();
  const {
    activeBookingId,
    activeBookingSource,
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
    if (!activeBookingId) {
      return undefined;
    }

    const unwatchBooking = watchBooking(activeBookingId);
    const unwatchTrip = activeTrip?.id ? watchTrip(activeTrip.id) : () => {};

    return () => {
      unwatchBooking();
      unwatchTrip();
    };
  }, [activeBookingId, activeTrip?.id, watchBooking, watchTrip]);

  useEffect(() => {
    if (!isBackendBackedTrip) {
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
  }, [isBackendBackedTrip, refreshActiveBooking]);

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
  const liveUpdateText = isBackendBackedTrip
    ? isConnected
      ? 'Realtime connected with polling fallback'
      : `Polling every ${LIVE_REFRESH_MS / 1000}s`
    : 'Demo trip simulation';
  const progressText = isScheduledRide
    ? `${etaLeft} min until pickup window`
    : `${Math.round(tripProgress * 100)}% complete`;
  const canCancelRide = !['completed', 'cancelled'].includes(String(activeTrip.status || '').toLowerCase());

  const handleShare = async () => {
    try {
      const payload = await shareBooking(activeBookingId, token);
      await Share.share({
        message: `Track my RideShare trip live: ${payload.shareUrl}`,
        title: 'RideShare live trip',
        url: payload.shareUrl,
      });
    } catch (error) {
      Alert.alert('Share unavailable', error.message || 'Unable to create the share link right now.');
    }
  };

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
          <Animated.View style={[styles.driverAvatar, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.driverAvatarText}>{activeTrip.driver.name.charAt(0)}</Text>
          </Animated.View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{activeTrip.driver.name}</Text>
            <View style={styles.driverMeta}>
              <Star size={12} color={COLORS.star} fill={COLORS.star} />
              <Text style={styles.driverRating}>{activeTrip.driver.rating}</Text>
              <Text style={styles.driverTrips}>| {activeTrip.driver.trips} trips</Text>
            </View>
            {activeTrip.driver.phone ? (
              <Text style={styles.driverPhone}>{activeTrip.driver.phone}</Text>
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

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={16} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Support', { bookingId: activeBookingId })}
          >
            <MessageCircle size={16} color={COLORS.accent} />
            <Text style={styles.actionButtonText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SOS', { bookingId: activeBookingId })}
          >
            <AlertTriangle size={16} color={COLORS.error} />
            <Text style={styles.actionButtonText}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Phone size={16} color={COLORS.success} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        </View>

        {canCancelRide ? (
          <TouchableOpacity
            style={styles.cancelButton}
            disabled={loading}
            onPress={() => {
              Alert.alert(
                'Cancel this ride?',
                'This will cancel the booking and release the reserved seat.',
                [
                  { text: 'Keep ride', style: 'cancel' },
                  {
                    text: 'Cancel ride',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await cancelBooking(activeBookingId);
                        navigation.goBack();
                      } catch (error) {
                        Alert.alert('Unable to cancel', error.message || 'Try again shortly.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>{loading ? 'Cancelling...' : 'Cancel ride'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: SIZES.xxl, ...FONTS.bold },
  emptySubtitle: { color: COLORS.textSecondary, marginTop: 10, textAlign: 'center', ...FONTS.regular },
  mapArea: { height: height * 0.42, position: 'relative' },
  mapPlaceholder: { flex: 1 },
  routePath: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  routeFilled: { height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  etaBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  etaText: { color: COLORS.textPrimary, ...FONTS.semiBold },
  midTripAlert: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: -28,
    padding: 14,
    ...SHADOWS.medium,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  alertContent: { flex: 1 },
  alertTitle: { color: COLORS.textPrimary, ...FONTS.semiBold },
  alertSubtitle: { color: COLORS.textSecondary, marginTop: 2, ...FONTS.regular },
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 10,
    padding: 20,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  progressContainer: { marginBottom: 16 },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
  },
  progressFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  progressText: {
    color: COLORS.textSecondary,
    marginTop: 8,
    ...FONTS.medium,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripTitle: { color: COLORS.textPrimary, fontSize: SIZES.xl, ...FONTS.bold },
  tripSubtitle: { color: COLORS.textSecondary, marginTop: 4, ...FONTS.regular },
  rideBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rideType: { color: COLORS.success, fontSize: SIZES.xs, ...FONTS.semiBold },
  driverCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    padding: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { color: COLORS.primary, fontSize: SIZES.lg, ...FONTS.bold },
  driverInfo: { flex: 1 },
  driverName: { color: COLORS.textPrimary, ...FONTS.semiBold },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  driverRating: { color: COLORS.textSecondary, ...FONTS.medium },
  driverTrips: { color: COLORS.textTertiary, ...FONTS.regular },
  driverPhone: { color: COLORS.textSecondary, marginTop: 6, ...FONTS.regular },
  plateNumber: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  plateText: { color: COLORS.textPrimary, ...FONTS.semiBold },
  vehicleRoute: { gap: 10, marginTop: 16 },
  vehicleBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vehicleText: { color: COLORS.textPrimary, ...FONTS.medium },
  routeInfo: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  routeText: { color: COLORS.textSecondary, flex: 1, ...FONTS.regular },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  actionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionButtonText: { color: COLORS.textPrimary, ...FONTS.medium },
  cancelButton: {
    alignItems: 'center',
    borderColor: COLORS.error + '40',
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    marginTop: 18,
    paddingVertical: 14,
  },
  cancelButtonText: { color: COLORS.error, ...FONTS.semiBold },
});
