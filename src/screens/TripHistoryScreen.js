import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  Car,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  TrendingDown,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useRide } from '../context/RideContext';

export default function TripHistoryScreen() {
  const { bookingHistory, error, loading, refreshBookingHistory } = useRide();

  useEffect(() => {
    refreshBookingHistory().catch(() => {
      // Shared state already exposes the error message.
    });
  }, [refreshBookingHistory]);

  const summary = {
    totalRides: bookingHistory.length,
    totalSaved: bookingHistory.reduce(
      (sum, booking) => sum + (booking.trip?.fareSavings || 0),
      0
    ),
    sharedRides: bookingHistory.filter((booking) => booking.trip?.rideType !== 'solo').length,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <Text style={styles.headerSubtitle}>Track all your persisted ride history</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
            <Car size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>{summary.totalRides}</Text>
            <Text style={styles.summaryLabel}>Total Rides</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.success }]}>
            <TrendingDown size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>Rs {summary.totalSaved}</Text>
            <Text style={styles.summaryLabel}>Total Saved</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.accent }]}>
            <Users size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>{summary.sharedRides}</Text>
            <Text style={styles.summaryLabel}>Shared Rides</Text>
          </View>
        </View>
      </ScrollView>

      <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
        <View style={styles.dateHeader}>
          <Calendar size={14} color={COLORS.textTertiary} />
          <Text style={styles.dateText}>Recent bookings</Text>
        </View>

        {loading && bookingHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading trip history...</Text>
          </View>
        ) : null}

        {!loading && bookingHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptyText}>
              Your confirmed bookings will appear here once you ride through the app.
            </Text>
          </View>
        ) : null}

        {bookingHistory.map((booking) => {
          const trip = booking.trip;
          const tripDate = booking.createdAt ? new Date(booking.createdAt) : null;
          const fareLabel = `Rs ${trip?.fareTotal || 0}`;
          const savingsLabel = trip?.fareSavings ? `Rs ${trip.fareSavings}` : null;
          const tripType = trip?.rideType === 'solo' ? 'Solo' : 'Shared';

          return (
            <TouchableOpacity key={booking.bookingId} style={styles.tripCard}>
              <View style={styles.tripTop}>
                <View style={styles.tripRoute}>
                  <View style={styles.routeDots}>
                    <View style={styles.greenDot} />
                    <View style={styles.dottedLine} />
                    <View style={styles.redDot} />
                  </View>
                  <View style={styles.routeTexts}>
                    <Text style={styles.routeText}>{trip?.pickup}</Text>
                    <Text style={styles.routeText}>{trip?.dropoff}</Text>
                  </View>
                </View>
                <View style={styles.tripFare}>
                  <Text style={styles.fareAmount}>{fareLabel}</Text>
                  {savingsLabel ? (
                    <View style={styles.savingsBadge}>
                      <TrendingDown size={10} color={COLORS.success} />
                      <Text style={styles.savingsText}>{savingsLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.tripMeta}>
                <View style={styles.metaItem}>
                  <Clock size={12} color={COLORS.textTertiary} />
                  <Text style={styles.metaText}>
                    {tripDate ? tripDate.toLocaleDateString() : 'Today'} •{' '}
                    {tripDate
                      ? tripDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'now'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={12} color={COLORS.textTertiary} />
                  <Text style={styles.metaText}>{trip?.distanceKm || 0} km</Text>
                </View>
                <View style={styles.metaItem}>
                  {tripType === 'Shared' ? (
                    <Users size={12} color={COLORS.success} />
                  ) : (
                    <Car size={12} color={COLORS.primary} />
                  )}
                  <Text style={[styles.metaText, tripType === 'Shared' && { color: COLORS.success }]}>
                    {tripType}
                  </Text>
                </View>
              </View>

              <View style={styles.tripBottom}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverAvatarText}>
                      {trip?.driver?.name?.charAt(0) || 'D'}
                    </Text>
                  </View>
                  <Text style={styles.driverName}>{trip?.driver?.name || 'Driver assigned'}</Text>
                </View>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      color={COLORS.star}
                      fill={star <= Math.round(trip?.driver?.rating || 0) ? COLORS.star : 'transparent'}
                    />
                  ))}
                </View>
                <ChevronRight size={16} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          );
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: SIZES.title,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  headerSubtitle: {
    fontSize: SIZES.md,
    color: COLORS.textTertiary,
    marginTop: 4,
    ...FONTS.regular,
  },
  summaryScroll: {
    backgroundColor: COLORS.surface,
    paddingBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryCard: {
    width: 130,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: SIZES.radius_xl,
    gap: 6,
  },
  summaryValue: {
    fontSize: SIZES.xxl,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },
  summaryLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    ...FONTS.medium,
  },
  tripList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  tripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripRoute: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
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
  dottedLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  routeTexts: {
    flex: 1,
    gap: 10,
  },
  routeText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  tripFare: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: SIZES.xl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
    marginTop: 4,
  },
  savingsText: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    ...FONTS.semiBold,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  tripBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  driverAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 11,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  driverName: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.small,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    ...FONTS.regular,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 10,
    ...FONTS.medium,
  },
});
