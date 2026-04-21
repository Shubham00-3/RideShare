import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, Headphones, LifeBuoy, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { createSupportTicket, fetchMySupportTickets } from '../services/api';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';

const CATEGORIES = ['general', 'trip', 'driver', 'safety'];

export default function SupportScreen({ navigation, route }) {
  const { token } = useAuth();
  const bookingId = route.params?.bookingId || null;
  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState(route.params?.initialCategory || 'trip');
  const [message, setMessage] = useState(route.params?.initialMessage || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const headerSubtitle = useMemo(
    () => (bookingId ? `Booking ${bookingId.slice(0, 8)} linked` : 'General support'),
    [bookingId]
  );

  const loadTickets = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetchMySupportTickets(token);
      setTickets(response.items || []);
    } catch (error) {
      Alert.alert('Support unavailable', error.message || 'Unable to load support tickets right now.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      return;
    }

    if (!message.trim()) {
      Alert.alert('Message needed', 'Add a few details so support knows what happened.');
      return;
    }

    setSubmitting(true);

    try {
      const ticket = await createSupportTicket(
        {
          bookingId,
          category,
          message,
          priority: category === 'safety' ? 'urgent' : 'normal',
        },
        token
      );
      setTickets((previous) => [ticket, ...previous]);
      setMessage('');
      Alert.alert('Support request sent', 'We added your ticket to the support queue.');
    } catch (error) {
      Alert.alert('Unable to send request', error.message || 'Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }, [bookingId, category, message, token]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Support</Text>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTickets} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LifeBuoy size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>New request</Text>
          </View>

          <View style={styles.chipRow}>
            {CATEGORIES.map((item) => {
              const selected = item === category;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            multiline
            placeholder="Tell support what happened..."
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={message}
            onChangeText={setMessage}
          />

          <TouchableOpacity style={styles.primaryButton} disabled={submitting} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Sending...' : 'Send to support'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Headphones size={18} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Recent tickets</Text>
          </View>

          {loading && tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null}

          {!loading && tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <ShieldAlert size={18} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No support tickets yet.</Text>
            </View>
          ) : null}

          {tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketCategory}>{ticket.category}</Text>
                <Text style={styles.ticketStatus}>{ticket.status}</Text>
              </View>
              <Text style={styles.ticketMessage}>{ticket.message}</Text>
              <Text style={styles.ticketMeta}>
                {new Date(ticket.createdAt).toLocaleString()}
                {ticket.bookingId ? ` • ${ticket.bookingId.slice(0, 8)}` : ''}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
    ...SHADOWS.small,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: SIZES.xxl, ...FONTS.bold },
  headerSubtitle: { color: COLORS.textSecondary, marginTop: 4, ...FONTS.regular },
  content: { flex: 1 },
  contentContainer: { gap: 12, padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 18,
    ...SHADOWS.small,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardTitle: { color: COLORS.textPrimary, fontSize: SIZES.lg, ...FONTS.semiBold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, textTransform: 'capitalize', ...FONTS.medium },
  chipTextActive: { color: COLORS.textInverse },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    color: COLORS.textPrimary,
    minHeight: 120,
    padding: 14,
    textAlignVertical: 'top',
    ...FONTS.regular,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: { color: COLORS.textInverse, ...FONTS.semiBold },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyText: { color: COLORS.textSecondary, ...FONTS.regular },
  ticketCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    marginTop: 10,
    padding: 14,
  },
  ticketTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  ticketCategory: { color: COLORS.primary, textTransform: 'capitalize', ...FONTS.semiBold },
  ticketStatus: { color: COLORS.textSecondary, textTransform: 'capitalize', ...FONTS.medium },
  ticketMessage: { color: COLORS.textPrimary, marginTop: 8, ...FONTS.regular },
  ticketMeta: { color: COLORS.textTertiary, fontSize: SIZES.xs, marginTop: 8, ...FONTS.medium },
});
