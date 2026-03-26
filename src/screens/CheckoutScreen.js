import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Percent,
  Shield,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { USER_PROFILE } from '../constants/data';
import { useRide } from '../context/RideContext';
import { addScheduledRideToCalendar } from '../services/calendarService';

export default function CheckoutScreen({ navigation }) {
  const {
    createBooking,
    error,
    loading,
    quote,
    refreshQuote,
    rideRequest,
    selectedMatch,
    selectedVehicle,
  } = useRide();
  const [insurance, setInsurance] = useState(true);
  const [midTripPickup, setMidTripPickup] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [syncCalendar, setSyncCalendar] = useState(true);
  const isScheduledRide = rideRequest?.rideType === 'schedule';

  useEffect(() => {
    refreshQuote({
      insurance,
      allowMidTripPickup: midTripPickup,
    });
  }, [insurance, midTripPickup, refreshQuote]);

  const paymentMethods = USER_PROFILE.paymentMethods.map((method) => ({
    id: method.type.toLowerCase(),
    label: method.label,
    type: method.type,
    icon: method.type === 'UPI' ? 'UPI' : method.type,
  }));

  const breakdown = quote?.breakdown;
  const totals = quote?.totals;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={styles.greenDot} />
              <View style={styles.dottedLine} />
              <View style={styles.redDot} />
            </View>
            <View style={styles.routeTexts}>
              <Text style={styles.routeLocation}>{rideRequest?.pickup}</Text>
              <Text style={styles.routeLocation}>{rideRequest?.dropoff}</Text>
            </View>
          </View>
          <View style={styles.routeMeta}>
            <View style={styles.metaItem}>
              <MapPin size={14} color={COLORS.textTertiary} />
              <Text style={styles.metaText}>{rideRequest?.distanceKm} km</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={COLORS.textTertiary} />
              <Text style={styles.metaText}>~{rideRequest?.durationMinutes} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color={COLORS.success} />
              <Text style={[styles.metaText, { color: COLORS.success }]}>
                {rideRequest?.rideType === 'solo' ? 'Solo' : 'Shared'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIcon}>
              <Car size={24} color={COLORS.primary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{selectedVehicle?.name}</Text>
              <Text style={styles.vehicleType}>
                {selectedVehicle?.type} • {selectedVehicle?.driver?.name} • overlap {selectedMatch?.overlap}%
              </Text>
            </View>
            <Text style={styles.vehicleETA}>{selectedVehicle?.eta}</Text>
          </View>
        </View>

        {isScheduledRide ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Scheduled departure</Text>
            <View style={styles.scheduleInfoRow}>
              <Clock size={18} color={COLORS.accent} />
              <View style={styles.scheduleInfoCopy}>
                <Text style={styles.scheduleInfoValue}>
                  {new Date(rideRequest.departureTime).toLocaleString()}
                </Text>
                <Text style={styles.scheduleInfoLabel}>
                  We will keep this booking aligned to your selected departure window.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>

          {breakdown ? (
            <>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Base fare</Text>
                <Text style={styles.fareValue}>₹{breakdown.baseFare}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance charge</Text>
                <Text style={styles.fareValue}>₹{breakdown.distanceFare}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Platform fee</Text>
                <Text style={styles.fareValue}>₹{breakdown.platformFee}</Text>
              </View>
              <View style={styles.savingsRow}>
                <Percent size={14} color={COLORS.success} />
                <Text style={styles.savingsLabel}>Shared ride discount</Text>
                <Text style={styles.savingsValue}>-₹{breakdown.poolingDiscount}</Text>
              </View>
              {midTripPickup ? (
                <View style={styles.savingsRow}>
                  <Users size={14} color={COLORS.success} />
                  <Text style={styles.savingsLabel}>Mid-trip pickup discount</Text>
                  <Text style={styles.savingsValue}>-₹{breakdown.midTripPickupDiscount}</Text>
                </View>
              ) : null}
              {insurance ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Smart Insurance</Text>
                  <Text style={styles.fareValue}>₹{breakdown.insuranceFee}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{totals.total}</Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>
                  You save ₹{totals.estimatedSavings} compared to solo fare ₹{totals.soloReferenceFare}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.quoteLoading}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.quoteLoadingText}>Calculating fare quote...</Text>
            </View>
          )}
        </View>

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
              trackColor={{ true: `${COLORS.primary}40`, false: COLORS.border }}
              thumbColor={insurance ? COLORS.primary : COLORS.textTertiary}
            />
          </View>

          <View style={[styles.toggleRow, styles.toggleDivider]}>
            <View style={styles.toggleInfo}>
              <Users size={18} color={COLORS.success} />
              <View>
                <Text style={styles.toggleLabel}>Allow mid-trip pickups</Text>
                <Text style={styles.toggleDesc}>If another rider joins, your fare drops further</Text>
              </View>
            </View>
            <Switch
              value={midTripPickup}
              onValueChange={setMidTripPickup}
              trackColor={{ true: `${COLORS.success}40`, false: COLORS.border }}
              thumbColor={midTripPickup ? COLORS.success : COLORS.textTertiary}
            />
          </View>

          {isScheduledRide ? (
            <View style={[styles.toggleRow, styles.toggleDivider]}>
              <View style={styles.toggleInfo}>
                <Calendar size={18} color={COLORS.accent} />
                <View>
                  <Text style={styles.toggleLabel}>Add to my calendar</Text>
                  <Text style={styles.toggleDesc}>
                    Save this scheduled ride as a calendar event after booking
                  </Text>
                </View>
              </View>
              <Switch
                value={syncCalendar}
                onValueChange={setSyncCalendar}
                trackColor={{ true: `${COLORS.accent}40`, false: COLORS.border }}
                thumbColor={syncCalendar ? COLORS.accent : COLORS.textTertiary}
              />
            </View>
          ) : null}
        </View>

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
              <View style={styles.paymentBadge}>
                <Text style={styles.paymentBadgeText}>{method.icon}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                <Text style={styles.paymentType}>{method.type}</Text>
              </View>
              {selectedPayment === method.id ? (
                <View style={styles.checkCircle}>
                  <Check size={14} color={COLORS.textInverse} />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomAction}>
        <View style={styles.totalInfo}>
          <Text style={styles.payLabel}>Total</Text>
          <Text style={styles.payAmount}>{totals ? `₹${totals.total}` : '...'}</Text>
        </View>
        <TouchableOpacity
          style={styles.payButton}
          disabled={loading || !quote}
          onPress={async () => {
            try {
              const booking = await createBooking({
                insurance,
                allowMidTripPickup: midTripPickup,
                paymentMethod: selectedPayment,
              });

              if (isScheduledRide && syncCalendar) {
                try {
                  await addScheduledRideToCalendar(booking);
                } catch (calendarError) {
                  Alert.alert(
                    'Calendar sync unavailable',
                    calendarError.message || 'We could not add this ride to your calendar.'
                  );
                }
              }

              navigation.navigate('ActiveTrip');
            } catch (bookingError) {
              Alert.alert(
                'Booking unavailable',
                bookingError.message || 'We could not confirm the ride right now.'
              );
            }
          }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <>
              <CreditCard size={20} color={COLORS.textInverse} />
              <Text style={styles.payButtonText}>Book & Pay</Text>
            </>
          )}
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
  },
  routeDots: {
    alignItems: 'center',
    marginRight: 12,
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
  dottedLine: {
    width: 2,
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 6,
  },
  routeTexts: {
    flex: 1,
    gap: 18,
  },
  routeLocation: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  routeMeta: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}16`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  vehicleType: {
    color: COLORS.textSecondary,
    marginTop: 4,
    ...FONTS.regular,
  },
  vehicleETA: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    marginBottom: 14,
    ...FONTS.semiBold,
  },
  scheduleInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  scheduleInfoCopy: {
    flex: 1,
  },
  scheduleInfoValue: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  scheduleInfoLabel: {
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 20,
    ...FONTS.regular,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fareLabel: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  fareValue: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savingsLabel: {
    flex: 1,
    color: COLORS.success,
    ...FONTS.medium,
  },
  savingsValue: {
    color: COLORS.success,
    ...FONTS.semiBold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalLabel: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  totalValue: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  savingsBadge: {
    marginTop: 14,
    borderRadius: SIZES.radius_lg,
    backgroundColor: `${COLORS.success}12`,
    padding: 12,
  },
  savingsBadgeText: {
    color: COLORS.success,
    ...FONTS.medium,
  },
  quoteLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  quoteLoadingText: {
    color: COLORS.textSecondary,
    marginTop: 10,
    ...FONTS.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 14,
    marginTop: 14,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  toggleDesc: {
    color: COLORS.textSecondary,
    marginTop: 4,
    ...FONTS.regular,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius_lg,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  paymentRowActive: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#F8FBFF',
  },
  paymentBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentBadgeText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  paymentType: {
    color: COLORS.textSecondary,
    marginTop: 2,
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
  errorText: {
    color: COLORS.error,
    marginBottom: 12,
    ...FONTS.medium,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.large,
  },
  totalInfo: {
    flex: 1,
  },
  payLabel: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  payAmount: {
    color: COLORS.textPrimary,
    marginTop: 4,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  payButton: {
    minWidth: 150,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  payButtonText: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
});
