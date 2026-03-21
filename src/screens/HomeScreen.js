import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  MapPin,
  Navigation,
  Search,
  Users,
  Car,
  Calendar,
  ChevronRight,
  Star,
  Shield,
  Zap,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { USER_PROFILE } from '../constants/data';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [selectedType, setSelectedType] = useState('shared');

  const rideTypes = [
    { id: 'shared', label: 'Shared Ride', icon: Users, savings: 'Save 40%', color: COLORS.success },
    { id: 'solo', label: 'Solo Ride', icon: Car, savings: null, color: COLORS.primary },
    { id: 'schedule', label: 'Schedule', icon: Calendar, savings: null, color: COLORS.accent },
  ];

  return (
    <View style={styles.container}>
      {/* Map Background Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapGrid}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={styles.mapGridLine} />
            ))}
          </View>
          <View style={styles.mapRoad1} />
          <View style={styles.mapRoad2} />
          {/* Driver markers */}
          {[
            { top: '30%', left: '25%' },
            { top: '45%', left: '60%' },
            { top: '55%', left: '35%' },
            { top: '25%', left: '70%' },
          ].map((pos, i) => (
            <View key={i} style={[styles.driverMarker, { top: pos.top, left: pos.left }]}>
              <Car size={14} color={COLORS.primary} />
            </View>
          ))}
          {/* Center marker */}
          <View style={styles.centerMarker}>
            <View style={styles.centerMarkerDot} />
            <View style={styles.centerMarkerRing} />
          </View>
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.locationBadge}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>New Delhi</Text>
          </View>
          <View style={styles.nearbyBadge}>
            <Text style={styles.nearbyText}>12 Rides nearby</Text>
          </View>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton}>
            <Text style={styles.mapControlText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton}>
            <Text style={styles.mapControlText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapControlButton, { marginTop: 8 }]}>
            <Navigation size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>Where are you going?</Text>

        {/* Location Inputs */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputDots}>
            <View style={styles.greenDot} />
            <View style={styles.dottedLine} />
            <View style={styles.redDot} />
          </View>
          <View style={styles.inputs}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Pickup location"
                placeholderTextColor={COLORS.textTertiary}
                value={pickup}
                onChangeText={setPickup}
              />
              <MapPin size={18} color={COLORS.textTertiary} />
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Where to?"
                placeholderTextColor={COLORS.textTertiary}
                value={dropoff}
                onChangeText={setDropoff}
              />
              <Search size={18} color={COLORS.textTertiary} />
            </View>
          </View>
        </View>

        {/* Ride Type Selection */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rideTypesScroll}>
          <View style={styles.rideTypes}>
            {rideTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.rideTypeCard,
                  selectedType === type.id && styles.rideTypeCardActive,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={[styles.rideTypeIcon, selectedType === type.id && { backgroundColor: type.color + '20' }]}>
                  <type.icon size={20} color={selectedType === type.id ? type.color : COLORS.textSecondary} />
                </View>
                <Text style={[styles.rideTypeLabel, selectedType === type.id && styles.rideTypeLabelActive]}>
                  {type.label}
                </Text>
                {type.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{type.savings}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Quick Places */}
        <View style={styles.quickPlaces}>
          {USER_PROFILE.savedPlaces.map((place) => (
            <TouchableOpacity key={place.id} style={styles.quickPlace}>
              <View style={styles.quickPlaceIcon}>
                <Star size={14} color={COLORS.primary} />
              </View>
              <View style={styles.quickPlaceInfo}>
                <Text style={styles.quickPlaceLabel}>{place.label}</Text>
                <Text style={styles.quickPlaceAddress} numberOfLines={1}>{place.address}</Text>
              </View>
              <ChevronRight size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Find Rides Button */}
        <TouchableOpacity
          style={styles.findButton}
          onPress={() => navigation.navigate('RideMatch')}
        >
          <Search size={20} color={COLORS.textInverse} />
          <Text style={styles.findButtonText}>Find Rides</Text>
        </TouchableOpacity>

        {/* Safety Badge */}
        <View style={styles.safetyBadge}>
          <Shield size={14} color={COLORS.success} />
          <Text style={styles.safetyText}>All rides are insured & GPS tracked</Text>
          <Zap size={14} color={COLORS.warning} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8ECF0',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapGridLine: {
    height: 1,
    backgroundColor: '#D5DAE0',
    marginVertical: 25,
    marginHorizontal: 10,
  },
  mapRoad1: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '15deg' }],
  },
  mapRoad2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '40%',
    width: 8,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '8deg' }],
  },
  driverMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -15,
    marginLeft: -15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    zIndex: 2,
  },
  centerMarkerRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary + '20',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius_full,
    gap: 6,
    ...SHADOWS.medium,
  },
  locationText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  nearbyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius_full,
  },
  nearbyText: {
    color: COLORS.textInverse,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: '35%',
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...SHADOWS.medium,
  },
  mapControlText: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 16,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inputDots: {
    alignItems: 'center',
    paddingTop: 18,
    gap: 2,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  dottedLine: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.border,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  inputs: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_md,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  inputDivider: {
    height: 4,
  },
  rideTypesScroll: {
    marginTop: 16,
    marginBottom: 12,
  },
  rideTypes: {
    flexDirection: 'row',
    gap: 10,
  },
  rideTypeCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 100,
  },
  rideTypeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  rideTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  rideTypeLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  rideTypeLabelActive: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  savingsBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 9,
    color: COLORS.success,
    ...FONTS.bold,
  },
  quickPlaces: {
    gap: 2,
  },
  quickPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  quickPlaceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPlaceInfo: {
    flex: 1,
  },
  quickPlaceLabel: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  quickPlaceAddress: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radius_lg,
    marginTop: 12,
    gap: 8,
    ...SHADOWS.medium,
  },
  findButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.xl,
    ...FONTS.semiBold,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  safetyText: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
});
