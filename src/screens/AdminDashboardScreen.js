import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, Search, ShieldCheck, Users } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import {
  fetchAdminBookings,
  fetchAdminIncidents,
  fetchAdminOverview,
  fetchAdminUsers,
  updateAdminBooking,
  updateAdminDriver,
  updateAdminIncident,
} from '../services/api';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';

export default function AdminDashboardScreen() {
  const { token } = useAuth();
  const { subscribe, watchAdmin } = useRealtime();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [incidents, setIncidents] = useState({
    sos: [],
    tickets: [],
  });

  const loadAdmin = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);

    try {
      const [nextOverview, nextUsers, nextBookings, nextIncidents] = await Promise.all([
        fetchAdminOverview(token),
        fetchAdminUsers(token, query),
        fetchAdminBookings(token),
        fetchAdminIncidents(token),
      ]);

      setOverview(nextOverview);
      setUsers(nextUsers.items || []);
      setBookings(nextBookings.items || []);
      setIncidents(nextIncidents);
    } catch (error) {
      Alert.alert('Admin unavailable', error.message || 'Unable to load admin tools right now.');
    } finally {
      setLoading(false);
    }
  }, [query, token]);

  useEffect(() => {
    watchAdmin();
    loadAdmin();
  }, [loadAdmin, watchAdmin]);

  useEffect(() => subscribe((eventName) => {
    if (eventName === 'admin:update' || eventName === 'support:update') {
      loadAdmin();
    }
  }), [loadAdmin, subscribe]);

  const handleResolveIncident = useCallback(async (incidentType, incidentId) => {
    try {
      await updateAdminIncident(
        incidentId,
        {
          incidentType,
          resolutionNotes: 'Resolved from mobile admin',
          status: 'resolved',
        },
        token
      );
      await loadAdmin();
    } catch (error) {
      Alert.alert('Unable to resolve incident', error.message || 'Try again shortly.');
    }
  }, [loadAdmin, token]);

  const handleCancelBooking = useCallback(async (bookingId) => {
    try {
      await updateAdminBooking(
        bookingId,
        {
          status: 'cancelled',
        },
        token
      );
      await loadAdmin();
    } catch (error) {
      Alert.alert('Unable to cancel booking', error.message || 'Try again shortly.');
    }
  }, [loadAdmin, token]);

  const handleSuspendDriver = useCallback(async (driverUserId) => {
    try {
      await updateAdminDriver(
        driverUserId,
        {
          isOnline: false,
        },
        token
      );
      await loadAdmin();
    } catch (error) {
      Alert.alert('Unable to suspend driver', error.message || 'Try again shortly.');
    }
  }, [loadAdmin, token]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Ops</Text>
        <Text style={styles.headerSubtitle}>Incident response and live ride controls</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAdmin} />}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textTertiary} />
          <TextInput
            placeholder="Search phone, name, email"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={loadAdmin}
          />
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
            <ShieldCheck size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>{overview?.incidents?.open_sos || 0}</Text>
            <Text style={styles.summaryLabel}>Open SOS</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.error }]}>
            <AlertTriangle size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>{overview?.incidents?.open_tickets || 0}</Text>
            <Text style={styles.summaryLabel}>Open Tickets</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.accent }]}>
            <Users size={20} color={COLORS.textInverse} />
            <Text style={styles.summaryValue}>
              {Array.isArray(overview?.users) ? overview.users.reduce((sum, row) => sum + Number(row.total || 0), 0) : 0}
            </Text>
            <Text style={styles.summaryLabel}>Users</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Provider readiness</Text>
          {overview?.readiness ? (
            <>
              <Text style={styles.readyLine}>Database: {overview.readiness.databaseConfigured ? 'ready' : 'missing'}</Text>
              <Text style={styles.readyLine}>Twilio: {overview.readiness.twilioConfigured ? 'ready' : 'missing'}</Text>
              <Text style={styles.readyLine}>Pelias: {overview.readiness.peliasConfigured ? 'ready' : 'missing'}</Text>
              <Text style={styles.readyLine}>Valhalla: {overview.readiness.valhallaConfigured ? 'ready' : 'missing'}</Text>
            </>
          ) : (
            <ActivityIndicator color={COLORS.primary} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open incidents</Text>
          {incidents.sos?.slice(0, 5).map((incident) => (
            <View key={incident.id} style={styles.rowCard}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>SOS • {incident.status}</Text>
                <Text style={styles.rowText}>{incident.summary || 'Emergency incident'}</Text>
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleResolveIncident('sos', incident.id)}>
                <Text style={styles.actionButtonText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          ))}
          {incidents.tickets?.slice(0, 5).map((ticket) => (
            <View key={ticket.id} style={styles.rowCard}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Ticket • {ticket.status}</Text>
                <Text style={styles.rowText}>{ticket.message}</Text>
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleResolveIncident('ticket', ticket.id)}>
                <Text style={styles.actionButtonText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent bookings</Text>
          {bookings.slice(0, 5).map((booking) => (
            <View key={booking.bookingId} style={styles.rowCard}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{booking.trip?.routeLabel}</Text>
                <Text style={styles.rowText}>{booking.status}</Text>
              </View>
              {!['cancelled', 'completed'].includes(String(booking.status || '').toLowerCase()) ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelBooking(booking.bookingId)}>
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Drivers</Text>
          {users.filter((user) => user.role === 'driver').slice(0, 5).map((driver) => (
            <View key={driver.id} style={styles.rowCard}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{driver.name}</Text>
                <Text style={styles.rowText}>{driver.phone}</Text>
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleSuspendDriver(driver.id)}>
                <Text style={styles.actionButtonText}>Go offline</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: COLORS.textPrimary, fontSize: SIZES.title, ...FONTS.bold },
  headerSubtitle: { color: COLORS.textSecondary, marginTop: 4, ...FONTS.regular },
  content: { flex: 1 },
  contentContainer: { gap: 12, padding: 16, paddingBottom: 32 },
  searchBar: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_lg,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    ...SHADOWS.small,
  },
  searchInput: { color: COLORS.textPrimary, flex: 1, paddingVertical: 14, ...FONTS.regular },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    borderRadius: SIZES.radius_xl,
    flex: 1,
    gap: 6,
    minHeight: 120,
    padding: 14,
  },
  summaryValue: { color: COLORS.textInverse, fontSize: SIZES.xl, ...FONTS.bold },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', ...FONTS.medium },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    ...SHADOWS.small,
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: SIZES.lg, marginBottom: 12, ...FONTS.semiBold },
  readyLine: { color: COLORS.textSecondary, marginTop: 6, ...FONTS.regular },
  rowCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    padding: 12,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, ...FONTS.semiBold },
  rowText: { color: COLORS.textSecondary, marginTop: 4, ...FONTS.regular },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: { color: COLORS.textInverse, fontSize: SIZES.sm, ...FONTS.semiBold },
});
