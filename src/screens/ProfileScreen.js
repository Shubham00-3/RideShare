import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapPin,
  CreditCard,
  Star,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  Crown,
  Bell,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { fetchProfileSummary } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { signOut, token, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const profile = {
    name: user?.name || 'RideShare user',
    phone: user?.phone || '',
    email: user?.email || '',
    rating: summary?.rating || user?.rating || 5,
    role: summary?.role || user?.role || 'rider',
    totalRides: summary?.totalRides || 0,
    totalSavings: `Rs. ${Math.round(summary?.totalSavings || 0)}`,
    savedPlacesCount: summary?.savedPlacesCount || 0,
    emergencyContactsCount: summary?.emergencyContactsCount || 0,
    primaryPaymentMethod: summary?.primaryPaymentMethod || 'None saved',
  };

  const loadProfileSummary = React.useCallback(async () => {
    if (!token) {
      setSummary(null);
      return;
    }

    setSummaryError(null);

    try {
      const payload = await fetchProfileSummary(token);
      setSummary(payload);
    } catch (error) {
      setSummary(null);
      setSummaryError(error.message || 'Unable to load profile summary.');
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialProfileSummary() {
      if (!token) {
        setSummary(null);
        return;
      }

      setSummaryError(null);

      try {
        const payload = await fetchProfileSummary(token);

        if (isMounted) {
          setSummary(payload);
        }
      } catch (error) {
        if (isMounted) {
          setSummary(null);
          setSummaryError(error.message || 'Unable to load profile summary.');
        }
      }
    }

    loadInitialProfileSummary();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileSummary();
    }, [loadProfileSummary])
  );

  const menuItems = [
    {
      icon: MapPin,
      label: 'Saved Places',
      value: `${profile.savedPlacesCount} places`,
      color: COLORS.primary,
      route: 'ProfileData',
      params: { kind: 'savedPlaces' },
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      value: profile.primaryPaymentMethod,
      color: COLORS.success,
      route: 'ProfileData',
      params: { kind: 'paymentMethods' },
    },
    {
      icon: Crown,
      label: 'Account Type',
      value: profile.role,
      color: COLORS.warning,
    },
    {
      icon: Shield,
      label: 'Emergency Contacts',
      value: `${profile.emergencyContactsCount} contacts`,
      color: COLORS.error,
      route: 'ProfileData',
      params: { kind: 'emergencyContacts' },
    },
    { icon: Settings, label: 'Settings', value: 'Edit profile', color: COLORS.textSecondary, route: 'ProfileSettings' },
    { icon: Bell, label: 'Notifications', value: 'On', color: COLORS.accent },
    { icon: HelpCircle, label: 'Help & Support', value: 'Call 112 in emergencies', color: COLORS.primary },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email || profile.phone}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Star size={12} color={COLORS.star} fill={COLORS.star} />
            <Text style={styles.badgeText}>{profile.rating}</Text>
          </View>
          <View style={styles.badge}>
            <Shield size={12} color={COLORS.success} />
            <Text style={styles.badgeText}>Verified</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: COLORS.warning + '15' }]}>
            <Crown size={12} color={COLORS.warning} />
            <Text style={[styles.badgeText, { color: COLORS.warning }]}>
              {profile.role}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          ['Trips', profile.totalRides.toString()],
          ['Saved', profile.totalSavings],
          ['Phone', profile.phone.slice(-4)],
        ].map(([label, value]) => (
          <View key={label} style={styles.statItem}>
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {summaryError ? <Text style={styles.errorText}>{summaryError}</Text> : null}
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => {
              if (item.route) {
                navigation.navigate(item.route, item.params);
              }
            }}
            disabled={!item.route}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '10' }]}>
              <item.icon size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
            {item.route ? <ChevronRight size={16} color={COLORS.textTertiary} /> : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.brandInk, paddingTop: 60, paddingBottom: 34, alignItems: 'center' },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: '#FFF', ...FONTS.bold },
  name: { fontSize: SIZES.xxl, color: '#FFF', ...FONTS.bold },
  email: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    ...FONTS.regular,
  },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: { fontSize: SIZES.xs, color: '#FFF', ...FONTS.semiBold },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: SIZES.xl, color: COLORS.textPrimary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textTertiary, ...FONTS.regular, marginTop: 4 },
  menuList: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  errorText: {
    color: COLORS.error,
    marginBottom: 12,
    ...FONTS.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_lg,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    gap: 12,
    ...SHADOWS.small,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: SIZES.md, color: COLORS.textPrimary, ...FONTS.medium },
  menuValue: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.regular,
    marginRight: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.error + '30',
  },
  logoutText: { fontSize: SIZES.lg, color: COLORS.error, ...FONTS.semiBold },
});
