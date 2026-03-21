import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { User, MapPin, CreditCard, Star, Settings, HelpCircle, LogOut, ChevronRight, Shield, Crown, Bell, Moon } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { USER_PROFILE } from '../constants/data';

export default function ProfileScreen({ navigation }) {
  const u = USER_PROFILE;
  const menuItems = [
    { icon: MapPin, label: 'Saved Places', value: `${u.savedPlaces.length} places`, color: COLORS.primary },
    { icon: CreditCard, label: 'Payment Methods', value: u.paymentMethods[0].label, color: COLORS.success },
    { icon: Crown, label: 'Subscription', value: u.subscription, color: COLORS.warning },
    { icon: Shield, label: 'Emergency Contacts', value: `${u.emergencyContacts.length} contacts`, color: COLORS.error },
    { icon: Bell, label: 'Notifications', value: 'On', color: COLORS.accent },
    { icon: Moon, label: 'Dark Mode', value: 'Off', color: '#6366F1' },
    { icon: Settings, label: 'Settings', value: '', color: COLORS.textSecondary },
    { icon: HelpCircle, label: 'Help & Support', value: '', color: COLORS.primary },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.avatarCircle}><Text style={s.avatarText}>{u.name.charAt(0)}</Text></View>
        <Text style={s.name}>{u.name}</Text>
        <Text style={s.email}>{u.email}</Text>
        <View style={s.badges}>
          <View style={s.badge}><Star size={12} color={COLORS.star} fill={COLORS.star} /><Text style={s.badgeText}>{u.rating}</Text></View>
          <View style={s.badge}><Shield size={12} color={COLORS.success} /><Text style={s.badgeText}>Verified</Text></View>
          <View style={[s.badge, {backgroundColor: COLORS.warning+'15'}]}><Crown size={12} color={COLORS.warning} /><Text style={[s.badgeText,{color:COLORS.warning}]}>{u.subscription}</Text></View>
        </View>
      </View>

      <View style={s.statsRow}>
        {[['🚗', u.totalRides.toString(), 'Rides'], ['💰', u.totalSavings, 'Saved'], ['⭐', u.rating.toString(), 'Rating']].map(([emoji, val, label]) => (
          <View key={label} style={s.statItem}><Text style={s.statEmoji}>{emoji}</Text><Text style={s.statVal}>{val}</Text><Text style={s.statLabel}>{label}</Text></View>
        ))}
      </View>

      <ScrollView style={s.menuList} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={item.label} style={[s.menuItem, i===menuItems.length-1&&{borderBottomWidth:0}]}>
            <View style={[s.menuIcon, {backgroundColor: item.color+'10'}]}><item.icon size={18} color={item.color} /></View>
            <Text style={s.menuLabel}>{item.label}</Text>
            {item.value ? <Text style={s.menuValue}>{item.value}</Text> : null}
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.logoutBtn} onPress={() => navigation?.navigate?.('Onboarding')}>
          <LogOut size={18} color={COLORS.error} /><Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
        <View style={{height:100}} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#FFF', ...FONTS.bold },
  name: { fontSize: SIZES.xxl, color: '#FFF', ...FONTS.bold },
  email: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4, ...FONTS.regular },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: SIZES.xs, color: '#FFF', ...FONTS.semiBold },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -16, borderRadius: 20, padding: 16, ...SHADOWS.medium },
  statItem: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: SIZES.xl, color: COLORS.textPrimary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textTertiary, ...FONTS.regular },
  menuList: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: SIZES.md, color: COLORS.textPrimary, ...FONTS.medium },
  menuValue: { fontSize: SIZES.sm, color: COLORS.textTertiary, ...FONTS.regular, marginRight: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 20, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.error+'30' },
  logoutText: { fontSize: SIZES.lg, color: COLORS.error, ...FONTS.semiBold },
});
