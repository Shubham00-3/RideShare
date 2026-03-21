import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Power, TrendingUp, Star, Award, MapPin, Clock, Users, RotateCcw, ChevronRight, Zap, Target, DollarSign } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MOCK_DRIVER_STATS, MOCK_RIDE_REQUESTS } from '../constants/data';

export default function DriverDashboardScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [returnTrip, setReturnTrip] = useState(false);
  const s = MOCK_DRIVER_STATS;

  return (
    <View style={st.container}>
      <View style={[st.header, isOnline ? st.headerOn : st.headerOff]}>
        <View style={st.headerTop}>
          <View>
            <Text style={st.headerTitle}>Driver Mode</Text>
            <Text style={st.headerSub}>{isOnline ? '🟢 Online' : '🔴 Offline'}</Text>
          </View>
          <Switch value={isOnline} onValueChange={setIsOnline}
            trackColor={{ true: 'rgba(255,255,255,0.3)', false: 'rgba(255,255,255,0.2)' }}
            thumbColor={isOnline ? '#4ADE80' : '#EF4444'} />
        </View>
        <View style={st.earningsRow}>
          {[['Today', s.todayEarnings], ['Week', s.weekEarnings], ['Rides', s.todayRides.toString()]].map(([l, v], i) => (
            <React.Fragment key={l}>
              {i > 0 && <View style={st.earningDiv} />}
              <View style={st.earningItem}>
                <Text style={st.earningLabel}>{l}</Text>
                <Text style={st.earningValue}>{v}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <ScrollView style={st.content} showsVerticalScrollIndicator={false}>
        {/* Streak */}
        <View style={st.streakCard}>
          <View style={st.row12}><View style={st.streakIcon}><Zap size={20} color={COLORS.warning} /></View>
            <View style={{flex:1}}><Text style={st.boldLg}>5-Star Streak</Text>
              <Text style={st.subSm}>{s.streak}/{s.streakTarget} rides • {s.streakTarget-s.streak} more for premium!</Text>
            </View>
          </View>
          <View style={st.streakDots}>
            {Array.from({length: s.streakTarget}).map((_, i) => (
              <View key={i} style={[st.sDot, i < s.streak ? st.sDotFill : st.sDotEmpty]}>
                {i < s.streak && <Star size={12} color="#FFF" fill="#FFF" />}
              </View>
            ))}
          </View>
          <View style={st.rewardRow}><Award size={14} color={COLORS.primary} />
            <Text style={st.rewardText}>Unlock: Priority airport & long-distance rides</Text>
          </View>
        </View>

        {/* Return Trip */}
        <View style={st.card}>
          <View style={st.row12}>
            <RotateCcw size={20} color={COLORS.success} />
            <View style={{flex:1}}><Text style={st.boldLg}>Return Trip Discount</Text>
              <Text style={st.subXs}>Monetize empty return trips (1x daily)</Text></View>
            <Switch value={returnTrip} onValueChange={setReturnTrip}
              trackColor={{true: COLORS.success+'40', false: COLORS.border}}
              thumbColor={returnTrip ? COLORS.success : COLORS.textTertiary} />
          </View>
          {returnTrip && <View style={st.rtInfo}><Text style={st.rtText}>✅ Active! Passengers on your return route see discounted fares.</Text></View>}
        </View>

        {/* Metrics */}
        <View style={st.card}>
          <Text style={st.secTitle}>Performance</Text>
          <View style={st.metricsGrid}>
            {[[Star, s.rating, 'Rating', COLORS.star], [Target, s.completionRate, 'Completion', COLORS.success],
              [TrendingUp, s.acceptanceRate, 'Acceptance', COLORS.primary], [DollarSign, s.monthEarnings, 'Monthly', COLORS.accent]
            ].map(([Icon, val, label, color], i) => (
              <View key={label} style={st.metricItem}>
                <Icon size={16} color={color} fill={label==='Rating'?color:undefined} />
                <Text style={st.metricVal}>{val}</Text>
                <Text style={st.metricLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Requests */}
        {isOnline && <>
          <Text style={st.secTitleOut}>Incoming Requests</Text>
          {MOCK_RIDE_REQUESTS.map(r => (
            <View key={r.id} style={st.reqCard}>
              <View style={st.reqTop}>
                <View style={{flex:1, gap:4}}>
                  <Text style={st.routeText}>📍 {r.pickup}</Text>
                  <Text style={st.routeText}>📌 {r.dropoff}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={st.earnAmt}>{r.estimatedEarnings}</Text>
                  {r.isShared && <View style={st.sharedBadge}><Users size={10} color={COLORS.success} /><Text style={st.sharedText}>{r.passengers}x shared</Text></View>}
                </View>
              </View>
              <View style={st.metaRow}>
                <Text style={st.metaTag}>📏 {r.distance}</Text>
                <Text style={st.metaTag}>⏱ {r.eta}</Text>
                {r.isShared && <Text style={[st.metaTag,{color:COLORS.success}]}>+17% vs solo</Text>}
              </View>
              <View style={st.reqActions}>
                <TouchableOpacity style={st.declineBtn}><Text style={st.decText}>Decline</Text></TouchableOpacity>
                <TouchableOpacity style={st.acceptBtn}><Text style={st.accText}>Accept</Text><ChevronRight size={16} color="#FFF" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </>}
        <View style={{height:100}} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerOn: { backgroundColor: '#1A2744' }, headerOff: { backgroundColor: '#3D2020' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: SIZES.xxl, color: '#FFF', ...FONTS.bold },
  headerSub: { fontSize: SIZES.md, color: 'rgba(255,255,255,0.7)', marginTop: 4, ...FONTS.regular },
  earningsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8 },
  earningItem: { flex: 1, alignItems: 'center' },
  earningLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', ...FONTS.regular, marginBottom: 4 },
  earningValue: { fontSize: SIZES.xl, color: '#FFF', ...FONTS.bold },
  earningDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12, ...SHADOWS.small },
  streakCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12, ...SHADOWS.medium, borderWidth: 1, borderColor: COLORS.warning+'30' },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.warning+'15', alignItems: 'center', justifyContent: 'center' },
  boldLg: { fontSize: SIZES.lg, color: COLORS.textPrimary, ...FONTS.bold },
  subSm: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2, ...FONTS.regular },
  subXs: { fontSize: SIZES.xs, color: COLORS.textTertiary, marginTop: 2, ...FONTS.regular },
  streakDots: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  sDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sDotFill: { backgroundColor: COLORS.star },
  sDotEmpty: { backgroundColor: COLORS.borderLight, borderWidth: 2, borderColor: COLORS.border },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary+'08', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  rewardText: { fontSize: SIZES.sm, color: COLORS.primary, ...FONTS.medium },
  rtInfo: { marginTop: 12, padding: 12, backgroundColor: COLORS.success+'08', borderRadius: 10 },
  rtText: { fontSize: SIZES.sm, color: COLORS.success, ...FONTS.medium, lineHeight: 20 },
  secTitle: { fontSize: SIZES.lg, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 14 },
  secTitleOut: { fontSize: SIZES.lg, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 10, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricItem: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 14, backgroundColor: COLORS.background, borderRadius: 14, gap: 4 },
  metricVal: { fontSize: SIZES.xl, color: COLORS.textPrimary, ...FONTS.bold },
  metricLabel: { fontSize: SIZES.xs, color: COLORS.textTertiary, ...FONTS.regular },
  reqCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 10, ...SHADOWS.medium, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between' },
  routeText: { fontSize: SIZES.md, color: COLORS.textPrimary, ...FONTS.medium },
  earnAmt: { fontSize: SIZES.xxl, color: COLORS.success, ...FONTS.bold },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.success+'10', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, marginTop: 4 },
  sharedText: { fontSize: SIZES.xs, color: COLORS.success, ...FONTS.semiBold },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaTag: { fontSize: SIZES.xs, color: COLORS.textTertiary, ...FONTS.medium, backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  declineBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border },
  decText: { fontSize: SIZES.md, color: COLORS.textSecondary, ...FONTS.semiBold },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.primary, gap: 4 },
  accText: { fontSize: SIZES.md, color: '#FFF', ...FONTS.semiBold },
});
