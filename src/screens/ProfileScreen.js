import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  Moon,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { USER_PROFILE } from '../constants/data';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const profile = {
    ...USER_PROFILE,
    name: user?.name || USER_PROFILE.name,
    phone: user?.phone || USER_PROFILE.phone,
    email: user?.email || USER_PROFILE.email,
    rating: user?.rating || USER_PROFILE.rating,
  };

  const menuItems = [
    {
      icon: MapPin,
      label: 'Saved Places',
      value: `${profile.savedPlaces.length} places`,
      color: COLORS.primary,
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      value: profile.paymentMethods[0].label,
      color: COLORS.success,
    },
    {
      icon: Crown,
      label: 'Account Type',
      value: user?.role || profile.subscription,
      color: COLORS.warning,
    },
    {
      icon: Shield,
      label: 'Emergency Contacts',
      value: `${profile.emergencyContacts.length} contacts`,
      color: COLORS.error,
    },
    { icon: Bell, label: 'Notifications', value: 'On', color: COLORS.accent },
    { icon: Moon, label: 'Dark Mode', value: 'Off', color: '#6366F1' },
    { icon: Settings, label: 'Settings', value: '', color: COLORS.textSecondary },
    { icon: HelpCircle, label: 'Help & Support', value: '', color: COLORS.primary },
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
              {user?.role || profile.subscription}
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
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '10' }]}>
              <item.icon size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
            <ChevronRight size={16} color={COLORS.textTertiary} />
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
  header: { backgroundColor: COLORS.primary, paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
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
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.medium,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: SIZES.xl, color: COLORS.textPrimary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textTertiary, ...FONTS.regular, marginTop: 4 },
  menuList: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
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
