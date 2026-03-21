import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  CreditCard,
  Shield,
  Check,
  ChevronRight,
  Car,
  MapPin,
  Clock,
  Users,
  Percent,
  Wallet,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

export default function CheckoutScreen({ navigation }) {
  const [insurance, setInsurance] = useState(true);
  const [midTripPickup, setMidTripPickup] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState('upi');

  const paymentMethods = [
    { id: 'upi', label: 'GPay - shubham@oksbi', icon: '💳', type: 'UPI' },
    { id: 'card', label: 'HDFC •••• 4589', icon: '💳', type: 'Card' },
    { id: 'wallet', label: 'Paytm Wallet', icon: '👛', type: 'Wallet' },
    { id: 'cash', label: 'Cash', icon: '💵', type: 'Cash' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={styles.greenDot} />
              <View style={styles.dottedLine} />
              <View style={styles.redDot} />
            </View>
            <View style={styles.routeTexts}>
              <Text style={styles.routeLocation}>Connaught Place, New Delhi</Text>
              <Text style={styles.routeLocation}>Akshardham Temple, Delhi</Text>
            </View>
          </View>
          <View style={styles.routeMeta}>
            <View style={styles.metaItem}>
              <MapPin size={14} color={COLORS.textTertiary} />
              <Text style={styles.metaText}>15 km</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={COLORS.textTertiary} />
              <Text style={styles.metaText}>~35 min</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color={COLORS.success} />
              <Text style={[styles.metaText, { color: COLORS.success }]}>Shared</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.sectionCard}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIcon}>
              <Car size={24} color={COLORS.primary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>Maruti Suzuki Swift</Text>
              <Text style={styles.vehicleType}>Economy • Rajesh K. ⭐ 4.9</Text>
            </View>
            <Text style={styles.vehicleETA}>3 min</Text>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base fare (15 km × ₹8/km)</Text>
            <Text style={styles.fareValue}>₹120</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance charge</Text>
            <Text style={styles.fareValue}>₹180</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Platform fee</Text>
            <Text style={styles.fareValue}>₹20</Text>
          </View>

          <View style={styles.savingsRow}>
            <Percent size={14} color={COLORS.success} />
            <Text style={styles.savingsLabel}>Shared ride discount</Text>
            <Text style={styles.savingsValue}>-₹40</Text>
          </View>

          {insurance && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Smart Insurance</Text>
              <Text style={styles.fareValue}>₹15</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{insurance ? 295 : 280}</Text>
          </View>

          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>
              🎉 You save ₹{insurance ? 205 : 220} compared to solo ride (₹500)
            </Text>
          </View>
        </View>

        {/* Add-ons */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add-ons</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Shield size={18} color={COLORS.primary} />
              <View>
                <Text style={styles.toggleLabel}>Smart Insurance</Text>
                <Text style={styles.toggleDesc}>Coverage up to ₹5 lakh • ₹15</Text>
              </View>
            </View>
            <Switch
              value={insurance}
              onValueChange={setInsurance}
              trackColor={{ true: COLORS.primary + '40', false: COLORS.border }}
              thumbColor={insurance ? COLORS.primary : COLORS.textTertiary}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 14 }]}>
            <View style={styles.toggleInfo}>
              <Users size={18} color={COLORS.success} />
              <View>
                <Text style={styles.toggleLabel}>Allow mid-trip pickups</Text>
                <Text style={styles.toggleDesc}>Get extra 5% discount if someone joins</Text>
              </View>
            </View>
            <Switch
              value={midTripPickup}
              onValueChange={setMidTripPickup}
              trackColor={{ true: COLORS.success + '40', false: COLORS.border }}
              thumbColor={midTripPickup ? COLORS.success : COLORS.textTertiary}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentRow,
                selectedPayment === method.id && styles.paymentRowActive,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                <Text style={styles.paymentType}>{method.type}</Text>
              </View>
              {selectedPayment === method.id && (
                <View style={styles.checkCircle}>
                  <Check size={14} color={COLORS.textInverse} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={styles.totalInfo}>
          <Text style={styles.payLabel}>Total</Text>
          <Text style={styles.payAmount}>₹{insurance ? 295 : 280}</Text>
        </View>
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => navigation.navigate('ActiveTrip')}
        >
          <CreditCard size={20} color={COLORS.textInverse} />
          <Text style={styles.payButtonText}>Book & Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 2,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  dottedLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  routeTexts: {
    flex: 1,
    gap: 14,
  },
  routeLocation: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  routeMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.medium,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 14,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIcon: {
    width: 50,
    height: 50,
    borderRadius: SIZES.radius_md,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  vehicleType: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: 2,
    ...FONTS.regular,
  },
  vehicleETA: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  fareLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  fareValue: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  savingsLabel: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.success,
    ...FONTS.medium,
  },
  savingsValue: {
    fontSize: SIZES.md,
    color: COLORS.success,
    ...FONTS.bold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: SIZES.xl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  totalValue: {
    fontSize: SIZES.xxl,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  savingsBadge: {
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius_md,
    marginTop: 12,
  },
  savingsBadgeText: {
    fontSize: SIZES.sm,
    color: COLORS.success,
    ...FONTS.medium,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  toggleDesc: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
    ...FONTS.regular,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SIZES.radius_lg,
    marginBottom: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  paymentIcon: {
    fontSize: 22,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  paymentType: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.large,
  },
  totalInfo: {
    flex: 1,
  },
  payLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  payAmount: {
    fontSize: SIZES.xxxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
    gap: 8,
    ...SHADOWS.medium,
  },
  payButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
});
