import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {
  Phone,
  MessageCircle,
  AlertTriangle,
  Navigation,
  Car,
  Star,
  Users,
  Clock,
  MapPin,
  X,
  Bell,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function ActiveTripScreen({ navigation }) {
  const [showMidTripAlert, setShowMidTripAlert] = useState(false);
  const [tripProgress, setTripProgress] = useState(0.2);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Simulate trip progress
    const interval = setInterval(() => {
      setTripProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(interval);
          return 0.9;
        }
        return prev + 0.05;
      });
    }, 3000);

    // Show mid-trip alert after 5 seconds
    const timeout = setTimeout(() => {
      setShowMidTripAlert(true);
    }, 5000);

    // Pulse animation for SOS
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Map Area */}
      <View style={styles.mapArea}>
        <View style={styles.mapPlaceholder}>
          {/* Road lines */}
          <View style={styles.road1} />
          <View style={styles.road2} />

          {/* Route path */}
          <View style={styles.routePath}>
            <View style={styles.routeFilled} style={[styles.routeFilled, { width: `${tripProgress * 100}%` }]} />
          </View>

          {/* Pickup marker */}
          <View style={[styles.marker, styles.pickupMarker]}>
            <View style={styles.markerDot} />
            <Text style={styles.markerLabel}>Pickup</Text>
          </View>

          {/* Driver car */}
          <View style={[styles.driverCar, { left: `${20 + tripProgress * 55}%` }]}>
            <Car size={18} color={COLORS.textInverse} />
          </View>

          {/* Dropoff marker */}
          <View style={[styles.marker, styles.dropoffMarker]}>
            <View style={[styles.markerDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.markerLabel}>Drop</Text>
          </View>

          {/* Distance badge */}
          <View style={styles.distanceBadge}>
            <MapPin size={12} color={COLORS.primary} />
            <Text style={styles.distanceText}>
              {Math.round((1 - tripProgress) * 15)} km left
            </Text>
          </View>
        </View>

        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => navigation.goBack()}>
            <X size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.etaBadge}>
            <Clock size={14} color={COLORS.primary} />
            <Text style={styles.etaText}>{Math.round((1 - tripProgress) * 35)} min</Text>
          </View>
        </View>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={{ fontSize: 18, ...FONTS.bold }}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Text style={{ fontSize: 18, ...FONTS.bold }}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, { marginTop: 8 }]}>
            <Navigation size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mid-Trip Pickup Alert */}
      {showMidTripAlert && (
        <View style={styles.midTripAlert}>
          <View style={styles.alertIcon}>
            <Bell size={16} color={COLORS.textInverse} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>New rider joining in 3 min! 🎉</Text>
            <Text style={styles.alertSubtitle}>Your fare reduces by ₹40</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMidTripAlert(false)}>
            <X size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Trip Details Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${tripProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(tripProgress * 100)}% complete
          </Text>
        </View>

        {/* Trip Info Header */}
        <View style={styles.tripHeader}>
          <Text style={styles.tripTitle}>Start your trip</Text>
          <View style={styles.rideBadge}>
            <Users size={12} color={COLORS.success} />
            <Text style={styles.rideType}>Shared Ride</Text>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>R</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>Rajesh K.</Text>
            <View style={styles.driverMeta}>
              <Star size={12} color={COLORS.star} fill={COLORS.star} />
              <Text style={styles.driverRating}>4.9</Text>
              <Text style={styles.driverTrips}>• 1,250 trips</Text>
            </View>
          </View>
          <View style={styles.plateNumber}>
            <Text style={styles.plateText}>DL 01 AB 1234</Text>
          </View>
        </View>

        {/* Vehicle & Route */}
        <View style={styles.vehicleRoute}>
          <View style={styles.vehicleBadge}>
            <Car size={14} color={COLORS.primary} />
            <Text style={styles.vehicleText}>Maruti Swift • White</Text>
          </View>
          <View style={styles.routeInfo}>
            <MapPin size={14} color={COLORS.success} />
            <Text style={styles.routeText} numberOfLines={1}>CP → Akshardham</Text>
          </View>
        </View>

        {/* Action Buttons */}
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
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => navigation.navigate('SOS')}
            >
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
    right: '15%',
    height: 5,
    backgroundColor: COLORS.primary + '30',
    borderRadius: 3,
  },
  routeFilled: {
    height: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  pickupMarker: {
    top: '38%',
    left: '12%',
  },
  dropoffMarker: {
    top: '38%',
    right: '12%',
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
    fontSize: 10,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
    marginTop: 2,
  },
  driverCar: {
    position: 'absolute',
    top: '40%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    marginLeft: -18,
  },
  distanceBadge: {
    position: 'absolute',
    top: '60%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radius_full,
    gap: 4,
    ...SHADOWS.small,
    left: '35%',
  },
  distanceText: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
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
    ...SHADOWS.medium,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radius_full,
    gap: 6,
    ...SHADOWS.medium,
  },
  etaText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: '35%',
  },
  midTripAlert: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: SIZES.radius_lg,
    gap: 10,
    ...SHADOWS.medium,
    zIndex: 10,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: COLORS.textInverse,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  alertSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 4,
    ...FONTS.medium,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  rideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
    gap: 4,
  },
  rideType: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    ...FONTS.semiBold,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: SIZES.xl,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  driverRating: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
  },
  driverTrips: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  plateNumber: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  plateText: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    letterSpacing: 0.5,
  },
  vehicleRoute: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.primary + '08',
    gap: 4,
  },
  actionBtnText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  sosButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.error,
    gap: 4,
    minWidth: 65,
  },
  sosText: {
    fontSize: SIZES.xs,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },
});
