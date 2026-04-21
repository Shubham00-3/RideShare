import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  Clock,
  MapPin,
  MessageSquare,
  Navigation,
  Receipt,
  Share2,
  Shield,
  Star,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import RouteMap from '../components/RouteMap';
import { useRide } from '../context/RideContext';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import {
  rescheduleRideBooking,
  shareBooking,
  submitBookingRating,
} from '../services/api';

function formatStatus(status) {
  const normalized = String(status || 'confirmed').replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function BookingDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const { watchBooking } = useRealtime();
  const { activeBookingId, cancelBooking, loading, refreshActiveBooking } = useRide();
  const [booking, setBooking] = useState(route.params?.booking || null);
  const [ratingScore, setRatingScore] = useState(route.params?.booking?.trip?.rating?.score || 5);
  const trip = booking?.trip;
  const createdAt = booking?.createdAt ? new Date(booking.createdAt) : null;
  const isActiveBooking =
    booking?.bookingId &&
    activeBookingId === booking.bookingId &&
    !['completed', 'cancelled'].includes(String(booking.status || ''));
  const isCancellable = !['completed', 'cancelled'].includes(String(booking?.status || '').toLowerCase());
  const isScheduledRide = String(trip?.status || '') === 'scheduled';

  useEffect(() => {
    setBooking(route.params?.booking || null);
  }, [route.params?.booking]);

  useEffect(() => {
    if (!booking?.bookingId) {
      return undefined;
    }

    return watchBooking(booking.bookingId);
  }, [booking?.bookingId, watchBooking]);

  const canRate = useMemo(
    () => String(booking?.status || '').toLowerCase() === 'completed' && !trip?.rating,
    [booking?.status, trip?.rating]
  );

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

  const handleShare = async () => {
    try {
      const payload = await shareBooking(booking.bookingId, token);
      await Share.share({
        message: `Track my RideShare trip: ${payload.shareUrl}`,
        title: 'RideShare trip link',
        url: payload.shareUrl,
      });
    } catch (error) {
      Alert.alert('Share unavailable', error.message || 'Unable to create a share link right now.');
    }
  };

  const handleReschedule = async () => {
    const nextDeparture = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    try {
      const nextBooking = await rescheduleRideBooking(booking.bookingId, nextDeparture, token);
      setBooking(nextBooking);
      Alert.alert('Ride rescheduled', 'Your pickup window has been moved by 30 minutes.');
    } catch (error) {
      Alert.alert('Unable to reschedule', error.message || 'Try again shortly.');
    }
  };

  const handleRating = async () => {
    try {
      const nextBooking = await submitBookingRating(
        booking.bookingId,
        {
          score: ratingScore,
          comment: `Rated ${ratingScore} stars from mobile app.`,
        },
        token
      );
      setBooking(nextBooking);
      Alert.alert('Thanks for rating', 'Your feedback has been saved.');
    } catch (error) {
      Alert.alert('Unable to save rating', error.message || 'Try again shortly.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <RouteMap
          style={styles.map}
          currentLocation={trip.currentLocation || null}
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

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleShare}>
            <Share2 size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Share trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Support', { bookingId: booking.bookingId })}
          >
            <MessageSquare size={16} color={COLORS.accent} />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SOS', { bookingId: booking.bookingId })}
          >
            <AlertTriangle size={16} color={COLORS.error} />
            <Text style={styles.actionText}>SOS</Text>
          </TouchableOpacity>
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
            <Text style={styles.summaryLabel}>Total fare</Text>
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
            <Text style={styles.supportText}>Live trip sharing and SOS are available from this booking</Text>
          </View>
        </View>

        {canRate ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Rate this trip</Text>
            <View style={styles.ratingActionRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity key={value} onPress={() => setRatingScore(value)}>
                  <Star
                    size={26}
                    color={COLORS.star}
                    fill={value <= ratingScore ? COLORS.star : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRating}>
              <Text style={styles.primaryButtonText}>Save rating</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {trip.rating ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Your rating</Text>
            <Text style={styles.supportText}>{trip.rating.score} stars</Text>
          </View>
        ) : null}

        {isActiveBooking ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              if (booking.bookingId === activeBookingId) {
                await refreshActiveBooking(booking.bookingId).catch(() => {});
              }
              navigation.navigate('ActiveTrip');
            }}
          >
            <Text style={styles.primaryButtonText}>Open live trip</Text>
          </TouchableOpacity>
        ) : null}

        {isScheduledRide && isCancellable ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReschedule}>
            <Text style={styles.secondaryButtonText}>Delay pickup by 30 minutes</Text>
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
    marginTop: 4,
    ...FONTS.regular,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 14,
  },
  heroMetaChip: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMetaText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    flex: 1,
    gap: 8,
    paddingVertical: 16,
    ...SHADOWS.small,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    ...SHADOWS.small,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    marginBottom: 12,
    ...FONTS.semiBold,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  routeLine: {
    width: 2,
    height: 34,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  routeLabels: {
    flex: 1,
    gap: 18,
  },
  routeLabel: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: COLORS.primary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  driverInfo: { flex: 1 },
  driverName: { color: COLORS.textPrimary, ...FONTS.semiBold },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  driverMetaText: { color: COLORS.textSecondary, ...FONTS.regular },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  infoPill: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoPillText: { color: COLORS.textPrimary, ...FONTS.medium },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  summaryLabel: { color: COLORS.textSecondary, ...FONTS.regular },
  summaryValue: { color: COLORS.textPrimary, ...FONTS.semiBold },
  summaryCode: { color: COLORS.textPrimary, fontSize: SIZES.xs, ...FONTS.bold },
  supportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  supportIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  supportText: { color: COLORS.textSecondary, flex: 1, ...FONTS.regular },
  ratingActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    paddingVertical: 14,
  },
  primaryButtonText: { color: COLORS.textInverse, ...FONTS.semiBold },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.primary + '35',
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
});
