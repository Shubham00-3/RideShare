import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  MapPin,
  Clock,
  Star,
  TrendingDown,
  Users,
  Car,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MOCK_TRIPS } from '../constants/data';

export default function TripHistoryScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <Text style={styles.headerSubtitle}>Track all your ride history</Text>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
            <Car size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>47</Text>
            <Text style={styles.summaryLabel}>Total Rides</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.success }]}>
            <TrendingDown size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>₹4,280</Text>
            <Text style={styles.summaryLabel}>Total Saved</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.accent }]}>
            <Users size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>32</Text>
            <Text style={styles.summaryLabel}>Shared Rides</Text>
          </View>
        </View>
      </ScrollView>

      {/* Trip List */}
      <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
        <View style={styles.dateHeader}>
          <Calendar size={14} color={COLORS.textTertiary} />
          <Text style={styles.dateText}>This Week</Text>
        </View>

        {MOCK_TRIPS.map((trip) => (
          <TouchableOpacity key={trip.id} style={styles.tripCard}>
            <View style={styles.tripTop}>
              <View style={styles.tripRoute}>
                <View style={styles.routeDots}>
                  <View style={styles.greenDot} />
                  <View style={styles.dottedLine} />
                  <View style={styles.redDot} />
                </View>
                <View style={styles.routeTexts}>
                  <Text style={styles.routeText}>{trip.pickup}</Text>
                  <Text style={styles.routeText}>{trip.dropoff}</Text>
                </View>
              </View>
              <View style={styles.tripFare}>
                <Text style={styles.fareAmount}>{trip.fare}</Text>
                {trip.savings && (
                  <View style={styles.savingsBadge}>
                    <TrendingDown size={10} color={COLORS.success} />
                    <Text style={styles.savingsText}>{trip.savings}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.tripMeta}>
              <View style={styles.metaItem}>
                <Clock size={12} color={COLORS.textTertiary} />
                <Text style={styles.metaText}>{trip.date} • {trip.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={12} color={COLORS.textTertiary} />
                <Text style={styles.metaText}>{trip.distance}</Text>
              </View>
              <View style={styles.metaItem}>
                {trip.type === 'Shared' ? (
                  <Users size={12} color={COLORS.success} />
                ) : (
                  <Car size={12} color={COLORS.primary} />
                )}
                <Text style={[styles.metaText, trip.type === 'Shared' && { color: COLORS.success }]}>
                  {trip.type}
                </Text>
              </View>
            </View>

            <View style={styles.tripBottom}>
              <View style={styles.driverInfo}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{trip.driver.charAt(0)}</Text>
                </View>
                <Text style={styles.driverName}>{trip.driver}</Text>
              </View>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    color={COLORS.star}
                    fill={star <= trip.rating ? COLORS.star : 'transparent'}
                  />
                ))}
              </View>
              <ChevronRight size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}

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
});
