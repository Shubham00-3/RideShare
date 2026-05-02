import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import { AlertTriangle, Phone, MapPin, X, Shield, Users, Share2 } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { fetchEmergencyContacts } from '../services/api';

export default function SOSScreen({ navigation }) {
  const { token } = useAuth();
  const pulseAnim = useState(new Animated.Value(1))[0];
  const [countdown, setCountdown] = useState(5);
  const [activated, setActivated] = useState(false);
  const [contactCount, setContactCount] = useState(0);
  const [contactsError, setContactsError] = useState(null);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (activated && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [activated, countdown]);

  useEffect(() => {
    let isMounted = true;

    async function loadEmergencyContacts() {
      if (!token) {
        setContactCount(0);
        return;
      }

      setContactsError(null);

      try {
        const response = await fetchEmergencyContacts(token);

        if (isMounted) {
          setContactCount((response.items || []).length);
        }
      } catch (error) {
        if (isMounted) {
          setContactCount(0);
          setContactsError(error.message || 'Unable to load contacts');
        }
      }
    }

    loadEmergencyContacts();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
        <X size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={s.content}>
        <Animated.View style={[s.sosCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={s.sosInner}>
            <AlertTriangle size={48} color="#FFF" />
            <Text style={s.sosText}>SOS</Text>
          </View>
        </Animated.View>

        {!activated ? (
          <>
            <Text style={s.title}>Emergency Assistance</Text>
            <Text style={s.subtitle}>Tap the button below to alert emergency contacts and share your live location</Text>
            <TouchableOpacity style={s.activateBtn} onPress={() => setActivated(true)}>
              <AlertTriangle size={20} color="#FFF" />
              <Text style={s.activateBtnText}>Activate Emergency SOS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.title}>SOS Activated</Text>
            <Text style={s.subtitle}>
              {countdown > 0 ? `Alerting emergency contacts in ${countdown}s...` : '📍 Location shared with emergency contacts'}
            </Text>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setActivated(false); setCountdown(5); }}>
              <Text style={s.cancelText}>{countdown > 0 ? 'Cancel' : 'Deactivate'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.actionCard} onPress={() => Linking.openURL('tel:112')}>
          <View style={[s.actionIcon, {backgroundColor: COLORS.error+'15'}]}><Phone size={22} color={COLORS.error} /></View>
          <Text style={s.actionLabel}>Call 112</Text>
          <Text style={s.actionDesc}>Police</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard}>
          <View style={[s.actionIcon, {backgroundColor: COLORS.primary+'15'}]}><Share2 size={22} color={COLORS.primary} /></View>
          <Text style={s.actionLabel}>Share Trip</Text>
          <Text style={s.actionDesc}>Live location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard}>
          <View style={[s.actionIcon, {backgroundColor: COLORS.success+'15'}]}><Users size={22} color={COLORS.success} /></View>
          <Text style={s.actionLabel}>Contacts</Text>
          <Text style={s.actionDesc}>{contactsError || `${contactCount} saved`}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.footer}>
        <Shield size={14} color="rgba(255,255,255,0.5)" />
        <Text style={s.footerText}>All rides are GPS tracked and insured up to ₹5 lakh</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 40 },
  footerText: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.4)', ...FONTS.regular },
});
