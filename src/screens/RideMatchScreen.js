import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  TrendingDown,
  Star,
  ShieldCheck,
  ChevronRight,
  Route,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MOCK_MATCHES } from '../constants/data';

export default function RideMatchScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Matched Rides</Text>
          <Text style={styles.headerSubtitle}>Connaught Place → Akshardham</Text>
        </View>
      </View>

      {/* Route Summary */}
      <View style={styles.routeSummary}>
        <View style={styles.routeInfo}>
          <Route size={18} color={COLORS.primary} />
          <Text style={styles.routeText}>15 km • ~35 min</Text>
        </View>
        <View style={styles.soloFare}>
          <Text style={styles.soloLabel}>Solo fare: </Text>
          <Text style={styles.soloPrice}>₹500</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          <Users size={16} color={COLORS.primary} /> {MOCK_MATCHES.length} matches found
        </Text>

        {MOCK_MATCHES.map((match) => (
          <TouchableOpacity
            key={match.id}
            style={styles.matchCard}
            onPress={() => navigation.navigate('VehicleSelect')}
          >
            {/* Passenger Info */}
            <View style={styles.passengerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {match.passenger.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.passengerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.passengerName}>{match.passenger.name}</Text>
                  {match.passenger.verified && (
                    <ShieldCheck size={14} color={COLORS.success} />
                  )}
                </View>
                <View style={styles.ratingRow}>
                  <Star size={12} color={COLORS.star} fill={COLORS.star} />
                  <Text style={styles.ratingText}>{match.passenger.rating}</Text>
                </View>
              </View>
              <View style={styles.overlapBadge}>
                <Text style={styles.overlapText}>{match.overlap}%</Text>
                <Text style={styles.overlapLabel}>overlap</Text>
              </View>
            </View>

            {/* Route Details */}
            <View style={styles.routeDetails}>
              <View style={styles.routePoint}>
                <View style={styles.greenDot} />
                <Text style={styles.routePointText}>{match.pickup}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={styles.redDot} />
                <Text style={styles.routePointText}>{match.dropoff}</Text>
              </View>
            </View>

            {/* Fare Comparison */}
            <View style={styles.fareComparison}>
              <View style={styles.fareItem}>
                <Text style={styles.fareLabel}>Shared Fare</Text>
                <Text style={styles.sharedFare}>{match.sharedFare}</Text>
              </View>
              <View style={styles.savingsItem}>
                <TrendingDown size={16} color={COLORS.success} />
                <Text style={styles.savingsAmount}>Save {match.savings}</Text>
              </View>
              <View style={styles.fareItem}>
                <Text style={styles.fareLabel}>ETA</Text>
                <View style={styles.etaRow}>
                  <Clock size={14} color={COLORS.textSecondary} />
                  <Text style={styles.etaText}>{match.eta}</Text>
                </View>
              </View>
            </View>

            {/* Detour Info */}
            <View style={styles.detourInfo}>
              <Text style={styles.detourText}>
                🔄 Detour: {match.detour} from your route
              </Text>
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => navigation.navigate('VehicleSelect')}
              >
                <Text style={styles.selectButtonText}>Select This Match</Text>
                <ChevronRight size={18} color={COLORS.textInverse} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Solo Option */}
        <TouchableOpacity
          style={styles.soloCard}
          onPress={() => navigation.navigate('VehicleSelect')}
        >
          <View style={styles.soloCardContent}>
            <Text style={styles.soloCardTitle}>🚗 Continue as Solo Ride</Text>
            <Text style={styles.soloCardSubtitle}>
              No sharing, full fare ₹500
            </Text>
            <Text style={styles.midTripNote}>
              💡 Opt into mid-trip pickups to save 5%
            </Text>
          </View>
          <ChevronRight size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    ...FONTS.regular,
  },
  routeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...SHADOWS.small,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  soloFare: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soloLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  soloPrice: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    textDecorationLine: 'line-through',
    ...FONTS.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginBottom: 14,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    marginBottom: 14,
    ...SHADOWS.medium,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: SIZES.xl,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  passengerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passengerName: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  overlapBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
  },
  overlapText: {
    fontSize: SIZES.xl,
    color: COLORS.success,
    ...FONTS.bold,
  },
  overlapLabel: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    ...FONTS.medium,
  },
  routeDetails: {
    marginTop: 14,
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    gap: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    marginLeft: -17,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    marginLeft: -17,
  },
  routeLine: {
    height: 8,
  },
  routePointText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  fareComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  fareItem: {
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
    marginBottom: 4,
  },
  sharedFare: {
    fontSize: SIZES.xxl,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  savingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radius_full,
    gap: 4,
  },
  savingsAmount: {
    fontSize: SIZES.sm,
    color: COLORS.success,
    ...FONTS.bold,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaText: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  detourInfo: {
    backgroundColor: COLORS.warning + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radius_md,
    marginTop: 12,
  },
  detourText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  actionRow: {
    marginTop: 14,
  },
  selectButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
    gap: 6,
  },
  selectButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  soloCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  soloCardContent: {
    flex: 1,
  },
  soloCardTitle: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  soloCardSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    ...FONTS.regular,
  },
  midTripNote: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    marginTop: 6,
    ...FONTS.medium,
  },
});
