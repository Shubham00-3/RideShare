import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Car,
  Clock,
  MapPin,
  Navigation,
  Receipt,
  Shield,
  Star,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import RouteMap from '../components/RouteMap';
import { useRide } from '../context/RideContext';

function formatStatus(status) {
  const normalized = String(status || 'confirmed').replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function BookingDetailScreen({ navigation, route }) {
  const { activeBookingId, cancelBooking, loading } = useRide();
  const [booking, setBooking] = useState(route.params?.booking || null);
  const trip = booking?.trip;
  const createdAt = booking?.createdAt ? new Date(booking.createdAt) : null;
  const isActiveBooking =
    booking?.bookingId &&
    activeBookingId === booking.bookingId &&
    !['completed', 'cancelled'].includes(String(booking.status || ''));
  const isCancellable = !['completed', 'cancelled'].includes(String(booking?.status || '').toLowerCase());

  useEffect(() => {
    setBooking(route.params?.booking || null);
  }, [route.params?.booking]);

  if (!booking || !trip) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Booking not available</Text>
        <Text style={styles.emptySubtitle}>
          We could not load this booking right now.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <RouteMap
          style={styles.map}
          pickupLocation={trip.pickupLocation || null}
          dropoffLocation={trip.dropoffLocation || null}
          routeGeometry={trip.routeGeometry || null}
          distanceLabel={`${trip.distanceKm || 0} km`}
        />

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{formatStatus(booking.status)}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{trip.routeLabel}</Text>
          <Text style={styles.heroSubtitle}>
            {createdAt
              ? `${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Recent booking'}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Clock size={13} color={COLORS.primary} />
              <Text style={styles.heroMetaText}>{trip.durationMinutes || 0} min</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <MapPin size={13} color={COLORS.primary} />
              <Text style={styles.heroMetaText}>{trip.distanceKm || 0} km</Text>
            </View>
            <View style={styles.heroMetaChip}>
              {trip.rideType === 'solo' ? (
                <Car size={13} color={COLORS.primary} />
              ) : (
                <Users size={13} color={COLORS.success} />
              )}
              <Text style={styles.heroMetaText}>
                {trip.rideType === 'solo' ? 'Solo ride' : 'Shared ride'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={styles.greenDot} />
              <View style={styles.routeLine} />
              <View style={styles.redDot} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeLabel}>{trip.pickup}</Text>
              <Text style={styles.routeLabel}>{trip.dropoff}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Driver and vehicle</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {trip.driver?.name?.charAt(0) || 'D'}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{trip.driver?.name || 'Driver assigned'}</Text>
              <View style={styles.ratingRow}>
                <Star size={12} color={COLORS.star} fill={COLORS.star} />
                <Text style={styles.driverMetaText}>{trip.driver?.rating || 0}</Text>
                <Text style={styles.driverMetaText}>| {trip.driver?.trips || 0} trips</Text>
              </View>
            </View>
          </View>

          <View style={styles.vehicleRow}>
            <View style={styles.infoPill}>
              <Car size={14} color={COLORS.primary} />
              <Text style={styles.infoPillText}>{trip.vehicle?.name || 'Vehicle'}</Text>
            </View>
            <View style={styles.infoPill}>
              <Navigation size={14} color={COLORS.primary} />
              <Text style={styles.infoPillText}>{trip.vehicle?.plateNumber || 'Plate pending'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fare details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total paid</Text>
            <Text style={styles.summaryValue}>Rs {trip.fareTotal || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Savings</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              Rs {trip.fareSavings || 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Booking ID</Text>
            <Text style={styles.summaryCode}>{booking.bookingId}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trip support</Text>
          <View style={styles.supportRow}>
            <View style={styles.supportIcon}>
              <Receipt size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.supportText}>Receipt-ready booking summary</Text>
          </View>
          <View style={styles.supportRow}>
            <View style={styles.supportIcon}>
              <Shield size={16} color={COLORS.success} />
            </View>
            <Text style={styles.supportText}>Booking tracked in your account history</Text>
          </View>
        </View>

        {isActiveBooking ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ActiveTrip')}
          >
            <Text style={styles.primaryButtonText}>Open live trip</Text>
          </TouchableOpacity>
        ) : null}

        {isCancellable ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            disabled={loading}
            onPress={() => {
              Alert.alert(
                'Cancel this ride?',
                'This will cancel the booking and release the reserved seat.',
                [
                  { text: 'Keep booking', style: 'cancel' },
                  {
                    text: 'Cancel ride',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const cancelledBooking = await cancelBooking(booking.bookingId);
                        setBooking((previous) => ({
                          ...(previous || {}),
                          ...cancelledBooking,
                          trip: cancelledBooking.trip || previous?.trip,
                        }));
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
            <Text style={styles.secondaryButtonText}>
              {loading ? 'Cancelling...' : 'Cancel ride'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
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
    ...FONTS.regular,
  },
  mapSection: {
    height: 250,
    position: 'relative',
  },
  map: {
    flex: 1,
    backgroundColor: '#E8ECF0',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  statusBadge: {
    borderRadius: SIZES.radius_full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  content: {
    flex: 1,
    marginTop: -24,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    ...SHADOWS.medium,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 6,
    ...FONTS.regular,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radius_full,
    backgroundColor: '#F4F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMetaText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    ...SHADOWS.small,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    marginBottom: 14,
    ...FONTS.semiBold,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: 5,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  routeLabels: {
    flex: 1,
    gap: 14,
  },
  routeLabel: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  driverMetaText: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoPillText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  summaryValue: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  summaryCode: {
    color: COLORS.textPrimary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  supportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: {
    flex: 1,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  secondaryButton: {
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.error,
    ...FONTS.semiBold,
  },
});
