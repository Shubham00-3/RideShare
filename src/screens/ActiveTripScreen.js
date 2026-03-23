import React, { useEffect, useState } from 'react';
import {
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

const { height } = Dimensions.get('window');

export default function ActiveTripScreen({ navigation }) {
  const {
    activeBookingId,
    activeBookingSource,
    activeTrip,
    refreshActiveBooking,
  } = useRide();
  const [showMidTripAlert, setShowMidTripAlert] = useState(false);
  const [tripProgress, setTripProgress] = useState(0.2);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (!activeBookingId || activeBookingSource !== 'api') {
      return;
    }

    refreshActiveBooking().catch(() => {
      // Keep the last known trip state on screen if refresh fails.
    });
  }, [activeBookingId, activeBookingSource, refreshActiveBooking]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTripProgress((previous) => {
        if (previous >= 0.92) {
          clearInterval(interval);
          return 0.92;
        }
        return previous + 0.05;
      });
    }, 3000);

    const timeout = setTimeout(() => {
      if (activeTrip?.midTripOffer) {
        setShowMidTripAlert(true);
      }
    }, 5000);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeTrip, pulseAnim]);

  if (!activeTrip) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No active trip yet</Text>
        <Text style={styles.emptySubtitle}>Book a matched ride first to see live trip state here.</Text>
      </View>
    );
  }

  const kmLeft = Math.max(Math.round((1 - tripProgress) * activeTrip.distanceKm), 1);
  const etaLeft = Math.max(Math.round((1 - tripProgress) * activeTrip.durationMinutes), 3);

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <View style={styles.mapPlaceholder}>
          <View style={styles.road1} />
          <View style={styles.road2} />

          <View style={styles.routePath}>
            <View style={[styles.routeFilled, { width: `${tripProgress * 100}%` }]} />
          </View>

          <View style={[styles.marker, styles.pickupMarker]}>
            <View style={styles.markerDot} />
            <Text style={styles.markerLabel}>Pickup</Text>
          </View>

          <View style={[styles.driverCar, { left: `${20 + tripProgress * 55}%` }]}>
            <Car size={18} color={COLORS.textInverse} />
          </View>

          <View style={[styles.marker, styles.dropoffMarker]}>
            <View style={[styles.markerDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.markerLabel}>Drop</Text>
          </View>

          <View style={styles.distanceBadge}>
            <MapPin size={12} color={COLORS.primary} />
            <Text style={styles.distanceText}>{kmLeft} km left</Text>
          </View>
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
            <Text style={styles.alertSubtitle}>Your fare reduces by ₹{activeTrip.midTripOffer.discount}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMidTripAlert(false)}>
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
          <Text style={styles.progressText}>{Math.round(tripProgress * 100)}% complete</Text>
        </View>

        <View style={styles.tripHeader}>
          <Text style={styles.tripTitle}>Trip in progress</Text>
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
              <Text style={styles.driverTrips}>• {activeTrip.driver.trips} trips</Text>
            </View>
          </View>
          <View style={styles.plateNumber}>
            <Text style={styles.plateText}>{activeTrip.vehicle.plateNumber}</Text>
          </View>
        </View>

        <View style={styles.vehicleRoute}>
          <View style={styles.vehicleBadge}>
            <Car size={14} color={COLORS.primary} />
            <Text style={styles.vehicleText}>
              {activeTrip.vehicle.name} • {activeTrip.vehicle.color}
            </Text>
          </View>
          <View style={styles.routeInfo}>
            <MapPin size={14} color={COLORS.success} />
            <Text style={styles.routeText} numberOfLines={1}>
              {activeTrip.routeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Current trip economics</Text>
          <Text style={styles.earningsLine}>Fare paid: ₹{activeTrip.fareTotal}</Text>
          <Text style={styles.earningsLine}>Savings unlocked: ₹{activeTrip.fareSavings}</Text>
        </View>

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
  road1: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FFF',
  },
  road2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '45%',
    width: 6,
    backgroundColor: '#FFF',
  },
  routePath: {
    position: 'absolute',
    top: '45%',
    left: '15%',
    width: '70%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#CFD8E3',
  },
  routeFilled: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  pickupMarker: {
    top: '41%',
    left: '14%',
  },
  dropoffMarker: {
    top: '41%',
    right: '13%',
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  markerLabel: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  driverCar: {
    position: 'absolute',
    top: '42%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: 64,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  distanceText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
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
