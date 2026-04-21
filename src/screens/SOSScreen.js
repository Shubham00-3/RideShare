import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, Phone, Shield, Users, X } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { triggerBookingSos } from '../services/api';

export default function SOSScreen({ navigation, route }) {
  const { token } = useAuth();
  const { activeBookingId, activeTrip } = useRide();
  const pulseAnim = useState(new Animated.Value(1))[0];
  const [countdown, setCountdown] = useState(5);
  const [activated, setActivated] = useState(false);
  const bookingId = route.params?.bookingId || activeBookingId;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (activated && countdown > 0) {
      const timeout = setTimeout(() => setCountdown((value) => value - 1), 1000);
      return () => clearTimeout(timeout);
    }

    if (activated && countdown === 0 && bookingId && token) {
      triggerBookingSos(
        bookingId,
        {
          latitude: activeTrip?.currentLocation?.coordinates?.latitude || null,
          longitude: activeTrip?.currentLocation?.coordinates?.longitude || null,
          summary: 'Emergency SOS triggered from rider app.',
        },
        token
      )
        .then(() => {
          Alert.alert('SOS activated', 'Support and your emergency contacts have been alerted.');
        })
        .catch((error) => {
          Alert.alert('SOS failed', error.message || 'We could not open the emergency incident.');
          setActivated(false);
          setCountdown(5);
        });
    }

    return undefined;
  }, [activated, activeTrip?.currentLocation?.coordinates?.latitude, activeTrip?.currentLocation?.coordinates?.longitude, bookingId, countdown, token]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <X size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View style={[styles.sosCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.sosInner}>
            <AlertTriangle size={48} color="#FFF" />
            <Text style={styles.sosText}>SOS</Text>
          </View>
        </Animated.View>

        {!activated ? (
          <>
            <Text style={styles.title}>Emergency Assistance</Text>
            <Text style={styles.subtitle}>
              Triggering SOS will notify support, create an incident, and attach your current trip location.
            </Text>
            <TouchableOpacity style={styles.activateBtn} onPress={() => setActivated(true)}>
              <AlertTriangle size={20} color="#FFF" />
              <Text style={styles.activateBtnText}>Activate Emergency SOS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>SOS Countdown</Text>
            <Text style={styles.subtitle}>
              {countdown > 0
                ? `Alerting support in ${countdown}s...`
                : 'Emergency incident is being created.'}
            </Text>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setActivated(false);
                setCountdown(5);
              }}
            >
              <Text style={styles.cancelText}>{countdown > 0 ? 'Cancel' : 'Close'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Emergency number', 'Dial 112 from your phone if immediate response is needed.')}>
          <View style={[styles.actionIcon, {backgroundColor: COLORS.error+'15'}]}><Phone size={22} color={COLORS.error} /></View>
          <Text style={styles.actionLabel}>Call 112</Text>
          <Text style={styles.actionDesc}>Emergency services</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, {backgroundColor: COLORS.primary+'15'}]}><Users size={22} color={COLORS.primary} /></View>
          <Text style={styles.actionLabel}>Contacts</Text>
          <Text style={styles.actionDesc}>From your profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Shield size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.footerText}>SOS incidents appear live in the admin console and support queue</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 60, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  sosCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.error+'30', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  sosInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  sosText: { color: '#FFF', fontSize: SIZES.xl, ...FONTS.bold, marginTop: 4 },
  title: { fontSize: SIZES.xxl, color: '#FFF', ...FONTS.bold, textAlign: 'center' },
  subtitle: { fontSize: SIZES.md, color: 'rgba(255,255,255,0.6)', ...FONTS.regular, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  activateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.error, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, marginTop: 30, ...SHADOWS.medium },
  activateBtnText: { color: '#FFF', fontSize: SIZES.lg, ...FONTS.semiBold },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginTop: 20 },
  cancelText: { color: '#FFF', fontSize: SIZES.lg, ...FONTS.semiBold },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  actionCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: SIZES.sm, color: '#FFF', ...FONTS.semiBold },
  actionDesc: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.5)', ...FONTS.regular },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 40, paddingHorizontal: 20 },
  footerText: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.4)', ...FONTS.regular, textAlign: 'center' },
});
