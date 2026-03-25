import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Power,
  RotateCcw,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  acceptDriverRequest,
  fetchDriverTrips,
  updateDriverSettings,
  updateDriverTripStatus,
} from '../services/api';

const EMPTY_SUMMARY = {
  activeTrips: 0,
  completedTrips: 0,
  earningsToday: 0,
  pendingRequests: 0,
};

const STATUS_ACTIONS = [
  { label: 'Driver Arriving', value: 'confirmed' },
  { label: 'On Trip', value: 'on_trip' },
  { label: 'Arriving Soon', value: 'arriving_soon' },
  { label: 'Complete', value: 'completed' },
];

export default function DriverDashboardScreen() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState({
    driver: null,
    items: [],
    pendingRequests: [],
    summary: EMPTY_SUMMARY,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdatingBookingId, setStatusUpdatingBookingId] = useState(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [settingsUpdating, setSettingsUpdating] = useState(false);
  const isDriver = user?.role === 'driver';

  const loadDriverDashboard = useCallback(async () => {
    if (!token || !isDriver) {
      setDashboard({
        driver: null,
        items: [],
        pendingRequests: [],
        summary: EMPTY_SUMMARY,
      });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await fetchDriverTrips(token);
      setDashboard({
        driver: payload.driver || null,
        items: payload.items || [],
        pendingRequests: payload.pendingRequests || [],
        summary: payload.summary || EMPTY_SUMMARY,
      });
      return payload;
    } catch (loadError) {
      const message = loadError.message || 'Unable to load driver dashboard right now.';
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [isDriver, token]);

  useEffect(() => {
    loadDriverDashboard().catch(() => {
      // Screen state already shows the error.
    });
  }, [loadDriverDashboard]);

  const handleSettingsChange = useCallback(async (patch) => {
    if (!token) {
      return;
    }

    setSettingsUpdating(true);
    setError(null);

    try {
      const payload = await updateDriverSettings(patch, token);
      setDashboard({
        driver: payload.driver || null,
        items: payload.items || [],
        pendingRequests: payload.pendingRequests || [],
        summary: payload.summary || EMPTY_SUMMARY,
      });
    } catch (settingsError) {
      const message = settingsError.message || 'Unable to update driver settings right now.';
      setError(message);
      Alert.alert('Unable to update driver settings', message);
    } finally {
      setSettingsUpdating(false);
    }
  }, [token]);

  const handleStatusChange = useCallback(async (bookingId, status) => {
    if (!token) {
      return;
    }

    setStatusUpdatingBookingId(bookingId);
    setError(null);

    try {
      await updateDriverTripStatus(bookingId, status, token);
      await loadDriverDashboard();
    } catch (updateError) {
      const message = updateError.message || 'Unable to update the trip status right now.';
      setError(message);
      Alert.alert('Unable to update trip', message);
    } finally {
      setStatusUpdatingBookingId(null);
    }
  }, [loadDriverDashboard, token]);

  const handleAcceptRequest = useCallback(async (requestId) => {
    if (!token) {
      return;
    }

    setAcceptingRequestId(requestId);
    setError(null);

    try {
      await acceptDriverRequest(requestId, token);
      await loadDriverDashboard();
    } catch (acceptError) {
      const message = acceptError.message || 'Unable to accept this rider request right now.';
      setError(message);
      Alert.alert('Unable to accept request', message);
    } finally {
      setAcceptingRequestId(null);
    }
  }, [loadDriverDashboard, token]);

  if (!isDriver) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.headerOff]}>
          <Text style={styles.headerTitle}>Driver Mode</Text>
          <Text style={styles.headerSub}>Sign in with a driver account to test live dispatch.</Text>
        </View>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Driver testing accounts</Text>
          <Text style={styles.placeholderText}>Vikram Patel: 9999900004</Text>
          <Text style={styles.placeholderText}>Sonal Mehta: 9999900005</Text>
          <Text style={styles.placeholderHint}>
            Search requests and booked trips will appear here after a driver signs in.
          </Text>
        </View>
      </View>
    );
  }

  const driver = dashboard.driver;
  const isOnline = Boolean(driver?.isOnline);
  const returnTrip = Boolean(driver?.returnTripAvailable);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isOnline ? styles.headerOn : styles.headerOff]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Driver Mode</Text>
            <Text style={styles.headerSub}>
              {isOnline ? 'Online and receiving rider demand' : 'Offline'}
            </Text>
          </View>
          <Switch
            disabled={settingsUpdating}
            value={isOnline}
            onValueChange={(value) => handleSettingsChange({ isOnline: value })}
            trackColor={{ true: 'rgba(255,255,255,0.3)', false: 'rgba(255,255,255,0.2)' }}
            thumbColor={isOnline ? '#4ADE80' : '#EF4444'}
          />
        </View>

        <View style={styles.summaryRow}>
          {[
            ['Pending', dashboard.summary.pendingRequests.toString()],
            ['Active', dashboard.summary.activeTrips.toString()],
            ['Today', `Rs. ${dashboard.summary.earningsToday}`],
          ].map(([label, value], index) => (
            <React.Fragment key={label}>
              {index > 0 ? <View style={styles.summaryDivider} /> : null}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDriverDashboard} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Power size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Shift controls</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <RotateCcw size={18} color={COLORS.success} />
              <View>
                <Text style={styles.toggleLabel}>Return trip visibility</Text>
                <Text style={styles.toggleSub}>Show discounted return-route rider requests</Text>
              </View>
            </View>
            <Switch
              disabled={settingsUpdating}
              value={returnTrip}
              onValueChange={(value) => handleSettingsChange({ returnTripAvailable: value })}
              trackColor={{ true: COLORS.success + '40', false: COLORS.border }}
              thumbColor={returnTrip ? COLORS.success : COLORS.textTertiary}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Incoming rider requests</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loading && dashboard.pendingRequests.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>No live rider demand right now</Text>
              <Text style={styles.emptySubtitle}>
                Have a rider search a corridor route while this driver is online, then pull to refresh.
              </Text>
            </View>
          ) : null}

          {dashboard.pendingRequests.map((request) => {
            const isAccepting = acceptingRequestId === request.id;

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTopRow}>
                  <View style={styles.tripMain}>
                    <Text style={styles.tripPhase}>{request.rider.name}</Text>
                    <Text style={styles.tripRoute}>{request.pickup} -> {request.dropoff}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{Math.round(request.overlapRatio * 100)}% overlap</Text>
                  </View>
                </View>

                <View style={styles.tripMetaRow}>
                  <View style={styles.metaChip}>
                    <Clock size={13} color={COLORS.warning} />
                    <Text style={styles.metaChipText}>{request.suggestedTrip.etaMinutes} min ETA</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Car size={13} color={COLORS.primary} />
                    <Text style={styles.metaChipText}>{request.suggestedTrip.vehicleName}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <CheckCircle2 size={13} color={COLORS.success} />
                    <Text style={styles.metaChipText}>Rs. {request.estimatedFare}</Text>
                  </View>
                </View>

                <View style={styles.tripMetaRow}>
                  <View style={styles.metaChipWide}>
                    <MapPin size={13} color={COLORS.accent} />
                    <Text style={styles.metaChipText}>{request.suggestedTrip.routeLabel}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.acceptRequestButton, isAccepting && styles.statusActionDisabled]}
                  disabled={isAccepting}
                  onPress={() => handleAcceptRequest(request.id)}
                >
                  {isAccepting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.acceptRequestText}>Accept Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Assigned trips</Text>
          </View>

          {loading && dashboard.items.length === 0 ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading driver trips...</Text>
            </View>
          ) : null}

          {!loading && dashboard.items.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>No active bookings yet</Text>
              <Text style={styles.emptySubtitle}>
                Rider checkout or accepted driver requests will appear here as live trips.
              </Text>
            </View>
          ) : null}

          {dashboard.items.map((booking) => {
            const isCompleted = booking.status === 'completed';
            const isCancelled = booking.status === 'cancelled';
            const isUpdating = statusUpdatingBookingId === booking.bookingId;

            return (
              <View key={booking.bookingId} style={styles.tripCard}>
                <View style={styles.tripTopRow}>
                  <View style={styles.tripMain}>
                    <Text style={styles.tripPhase}>{booking.trip.phaseLabel}</Text>
                    <Text style={styles.tripRoute}>{booking.trip.routeLabel}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{booking.status.replace('_', ' ')}</Text>
                  </View>
                </View>

                <View style={styles.tripMetaRow}>
                  <View style={styles.metaChip}>
                    <UserRound size={13} color={COLORS.primary} />
                    <Text style={styles.metaChipText}>{booking.rider?.name || 'Assigned rider'}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Clock size={13} color={COLORS.warning} />
                    <Text style={styles.metaChipText}>{booking.trip.etaMinutes} min</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Car size={13} color={COLORS.success} />
                    <Text style={styles.metaChipText}>{Math.round((booking.trip.progress || 0) * 100)}%</Text>
                  </View>
                </View>

                <View style={styles.tripMetaRow}>
                  <View style={styles.metaChipWide}>
                    <MapPin size={13} color={COLORS.accent} />
                    <Text style={styles.metaChipText}>{booking.trip.nextStopLabel}</Text>
                  </View>
                  <View style={styles.metaChipWide}>
                    <Text style={styles.metaChipText}>Rs. {booking.trip.fareTotal}</Text>
                  </View>
                </View>

                {!isCompleted && !isCancelled ? (
                  <View style={styles.actionsWrap}>
                    {STATUS_ACTIONS.map((action) => {
                      const isActive = booking.status === action.value;

                      return (
                        <TouchableOpacity
                          key={action.value}
                          style={[
                            styles.statusAction,
                            isActive && styles.statusActionActive,
                            isUpdating && styles.statusActionDisabled,
                          ]}
                          disabled={isUpdating}
                          onPress={() => handleStatusChange(booking.bookingId, action.value)}
                        >
                          <Text
                            style={[
                              styles.statusActionText,
                              isActive && styles.statusActionTextActive,
                            ]}
                          >
                            {action.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerOn: {
    backgroundColor: '#1A2744',
  },
  headerOff: {
    backgroundColor: '#3D2020',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    color: '#FFF',
    ...FONTS.bold,
  },
  headerSub: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    ...FONTS.regular,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    ...FONTS.regular,
  },
  summaryValue: {
    fontSize: SIZES.xl,
    color: '#FFF',
    ...FONTS.bold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.bold,
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
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  toggleSub: {
    marginTop: 4,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  placeholderCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    ...SHADOWS.medium,
  },
  placeholderTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  placeholderText: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  placeholderHint: {
    marginTop: 16,
    color: COLORS.textSecondary,
    lineHeight: 21,
    ...FONTS.regular,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  emptyBlock: {
    paddingVertical: 24,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  emptySubtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    lineHeight: 20,
    ...FONTS.regular,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 10,
    ...FONTS.medium,
  },
  requestCard: {
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  tripCard: {
    borderRadius: 18,
    backgroundColor: COLORS.background,
    padding: 14,
    marginTop: 10,
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  tripMain: {
    flex: 1,
  },
  tripPhase: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  tripRoute: {
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    marginTop: 4,
    ...FONTS.bold,
  },
  statusBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    ...FONTS.medium,
  },
  tripMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaChipWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaChipText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  acceptRequestButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  acceptRequestText: {
    color: '#FFF',
    ...FONTS.semiBold,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statusAction: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  statusActionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusActionDisabled: {
    opacity: 0.6,
  },
  statusActionText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  statusActionTextActive: {
    color: '#FFF',
  },
});
