import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Route,
  ShieldCheck,
  Star,
  TrendingDown,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useRide } from '../context/RideContext';

export default function RideMatchScreen({ navigation }) {
  const { matches, rideRequest, chooseMatch } = useRide();

  const routeTitle = rideRequest
    ? `${rideRequest.pickup.split(',')[0]} -> ${rideRequest.dropoff.split(',')[0]}`
    : 'Search for a corridor';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Matched Rides</Text>
          <Text style={styles.headerSubtitle}>{routeTitle}</Text>
        </View>
      </View>

      <View style={styles.routeSummary}>
        <View style={styles.routeInfo}>
          <Route size={18} color={COLORS.primary} />
          <Text style={styles.routeText}>
            {rideRequest ? `${rideRequest.distanceKm} km • ~${rideRequest.durationMinutes} min` : 'Waiting for route'}
          </Text>
        </View>
        <View style={styles.routePill}>
          <Text style={styles.routePillText}>
            {rideRequest?.rideType === 'solo' ? 'Solo + upsell' : 'Shared optimized'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {matches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No corridor matches yet</Text>
            <Text style={styles.emptySubtitle}>
              Try a nearby destination or enable shared ride mode to widen the overlap search.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {matches.length} potential shared routes
            </Text>

            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => {
                  chooseMatch(match);
                  navigation.navigate('VehicleSelect');
                }}
              >
                <View style={styles.passengerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{match.passenger.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.passengerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.passengerName}>{match.pickup}</Text>
                      <ShieldCheck size={14} color={COLORS.success} />
                    </View>
                    <View style={styles.ratingRow}>
                      <Star size={12} color={COLORS.star} fill={COLORS.star} />
                      <Text style={styles.ratingText}>{match.passenger.rating}</Text>
                      <Text style={styles.ratingMeta}>• {match.driverPoolHeadline}</Text>
                    </View>
                  </View>
                  <View style={styles.overlapBadge}>
                    <Text style={styles.overlapText}>{match.overlap}%</Text>
                    <Text style={styles.overlapLabel}>overlap</Text>
                  </View>
                </View>

                <View style={styles.routeDetailCard}>
                  <Text style={styles.routeHeadline}>{match.pickup}</Text>
                  <Text style={styles.routeConnector}>shares</Text>
                  <Text style={styles.routeHeadline}>{match.dropoff}</Text>
                  <Text style={styles.routeSubline}>
                    {match.overlapKm} km common corridor • {match.detour}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricCard}>
                    <TrendingDown size={16} color={COLORS.success} />
                    <Text style={styles.metricValue}>{match.savings}</Text>
                    <Text style={styles.metricLabel}>estimated savings</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Clock size={16} color={COLORS.primary} />
                    <Text style={styles.metricValue}>{match.eta}</Text>
                    <Text style={styles.metricLabel}>pickup ETA</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Users size={16} color={COLORS.warning} />
                    <Text style={styles.metricValue}>{match.vehicles.length}</Text>
                    <Text style={styles.metricLabel}>driver options</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <View>
                    <Text style={styles.sharedFareLabel}>Projected shared fare</Text>
                    <Text style={styles.sharedFare}>{match.sharedFare}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => {
                      chooseMatch(match);
                      navigation.navigate('VehicleSelect');
                    }}
                  >
                    <Text style={styles.selectButtonText}>See vehicles</Text>
                    <ChevronRight size={18} color={COLORS.textInverse} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
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
    backgroundColor: COLORS.brandInk,
    paddingTop: 60,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    ...FONTS.regular,
  },
  routeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  routePill: {
    borderRadius: 999,
    backgroundColor: `${COLORS.success}16`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routePillText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 20,
    ...SHADOWS.small,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 21,
    ...FONTS.regular,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}16`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  passengerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passengerName: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  ratingText: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  ratingMeta: {
    color: COLORS.textTertiary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  overlapBadge: {
    alignItems: 'center',
    backgroundColor: `${COLORS.success}16`,
    borderRadius: SIZES.radius_lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlapText: {
    color: COLORS.success,
    ...FONTS.bold,
  },
  overlapLabel: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  routeDetailCard: {
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.surfaceSoft,
    padding: 14,
    marginTop: 14,
  },
  routeHeadline: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  routeConnector: {
    color: COLORS.textTertiary,
    marginVertical: 4,
    ...FONTS.medium,
  },
  routeSubline: {
    color: COLORS.textSecondary,
    marginTop: 8,
    ...FONTS.regular,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FBFF',
    borderRadius: SIZES.radius_lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  metricValue: {
    color: COLORS.textPrimary,
    marginTop: 8,
    ...FONTS.semiBold,
  },
  metricLabel: {
    color: COLORS.textTertiary,
    fontSize: SIZES.xs,
    marginTop: 4,
    ...FONTS.medium,
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharedFareLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  sharedFare: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    marginTop: 2,
    ...FONTS.bold,
  },
  selectButton: {
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.brandInk,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectButtonText: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
});
