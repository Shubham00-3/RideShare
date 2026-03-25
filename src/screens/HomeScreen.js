import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  Car,
  ChevronRight,
  MapPin,
  Navigation,
  Search,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { USER_PROFILE } from '../constants/data';
import { useRide } from '../context/RideContext';
import RouteMap from '../components/RouteMap';
import { fetchRoutePreview, searchPlaces } from '../services/api';

const { height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { error, loading, searchForm, searchRides } = useRide();
  const [pickup, setPickup] = useState(searchForm.pickup);
  const [dropoff, setDropoff] = useState(searchForm.dropoff);
  const [selectedType, setSelectedType] = useState(searchForm.rideType);
  const [pickupLocation, setPickupLocation] = useState(searchForm.pickupLocation || null);
  const [dropoffLocation, setDropoffLocation] = useState(searchForm.dropoffLocation || null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  useEffect(() => {
    setPickup(searchForm.pickup);
    setDropoff(searchForm.dropoff);
    setSelectedType(searchForm.rideType);
    setPickupLocation(searchForm.pickupLocation || null);
    setDropoffLocation(searchForm.dropoffLocation || null);
  }, [searchForm]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!pickup.trim() || activeField !== 'pickup') {
        setPickupSuggestions([]);
        return;
      }

      const response = await searchPlaces(pickup);
      setPickupSuggestions(response.items || []);
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [activeField, pickup]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!dropoff.trim() || activeField !== 'dropoff') {
        setDropoffSuggestions([]);
        return;
      }

      const response = await searchPlaces(dropoff, {
        focusPoint: pickupLocation?.coordinates || null,
      });
      setDropoffSuggestions(response.items || []);
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [activeField, dropoff, pickupLocation]);

  const rideTypes = [
    { id: 'shared', label: 'Shared Ride', icon: Users, savings: 'Save 40%', color: COLORS.success },
    { id: 'solo', label: 'Solo Ride', icon: Car, savings: null, color: COLORS.primary },
    { id: 'schedule', label: 'Schedule', icon: Calendar, savings: null, color: COLORS.accent },
  ];

  const resolveLocation = async (label, currentLocation, focusPoint) => {
    if (currentLocation?.label === label) {
      return currentLocation;
    }

    const response = await searchPlaces(label, {
      focusPoint,
    });

    return response.items?.[0] || null;
  };

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert('Locations needed', 'Pick both pickup and dropoff to build the route preview.');
      return;
    }

    try {
      setRoutingLoading(true);
      const resolvedPickup = await resolveLocation(pickup, pickupLocation, null);
      const resolvedDropoff = await resolveLocation(
        dropoff,
        dropoffLocation,
        resolvedPickup?.coordinates || null
      );

      if (!resolvedPickup || !resolvedDropoff) {
        Alert.alert('Locations not found', 'Try selecting a suggestion from the search list first.');
        return;
      }

      const route = await fetchRoutePreview({
        pickup: resolvedPickup,
        dropoff: resolvedDropoff,
      });

      await searchRides({
        pickup: resolvedPickup.label,
        dropoff: resolvedDropoff.label,
        pickupLocation: resolvedPickup,
        dropoffLocation: resolvedDropoff,
        route,
        rideType: selectedType,
        allowMidTripPickup: selectedType !== 'solo',
      });
      navigation.navigate('RideMatch');
    } catch (searchError) {
      Alert.alert('Search failed', searchError.message || 'Unable to search rides right now.');
    } finally {
      setRoutingLoading(false);
    }
  };

  const renderSuggestions = (field, items) => {
    if (activeField !== field || items.length === 0) {
      return null;
    }

    return (
      <View style={styles.suggestionList}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.suggestionRow}
            onPress={() => {
              if (field === 'pickup') {
                setPickup(item.label);
                setPickupLocation(item);
                setPickupSuggestions([]);
              } else {
                setDropoff(item.label);
                setDropoffLocation(item);
                setDropoffSuggestions([]);
              }

              setActiveField(null);
            }}
          >
            <View style={styles.suggestionIcon}>
              <MapPin size={14} color={COLORS.primary} />
            </View>
            <View style={styles.suggestionInfo}>
              <Text style={styles.suggestionLabel}>{item.name}</Text>
              <Text style={styles.suggestionMeta}>{item.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <RouteMap
          style={styles.mapPlaceholder}
          pickupLocation={pickupLocation || searchForm.pickupLocation || null}
          dropoffLocation={dropoffLocation || searchForm.dropoffLocation || null}
          routeGeometry={
            pickupLocation?.coordinates && dropoffLocation?.coordinates
              ? null
              : searchForm.route?.geometry || null
          }
          distanceLabel={
            searchForm.distanceKm ? `${Math.round(searchForm.distanceKm)} km corridor` : null
          }
        />

        <View style={styles.topBar}>
          <View style={styles.locationBadge}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>Delhi-NCR</Text>
          </View>
          <View style={styles.nearbyBadge}>
            <Text style={styles.nearbyText}>Partial-route matching live</Text>
          </View>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton}>
            <Text style={styles.mapControlText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton}>
            <Text style={styles.mapControlText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapControlButton, { marginTop: 8 }]}>
            <Navigation size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Match overlapping routes</Text>
        <Text style={styles.sheetSubtitle}>
          Search for rides even if your destination is only partially aligned with another rider.
        </Text>

        <View style={styles.inputsContainer}>
          <View style={styles.inputDots}>
            <View style={styles.greenDot} />
            <View style={styles.dottedLine} />
            <View style={styles.redDot} />
          </View>
          <View style={styles.inputs}>
            <View style={styles.inputBlock}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Pickup location"
                  placeholderTextColor={COLORS.textTertiary}
                  value={pickup}
                  onFocus={() => setActiveField('pickup')}
                  onChangeText={(value) => {
                    setPickup(value);
                    setPickupLocation(null);
                    setActiveField('pickup');
                  }}
                />
                <MapPin size={18} color={COLORS.textTertiary} />
              </View>
              {renderSuggestions('pickup', pickupSuggestions)}
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputBlock}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Where to?"
                  placeholderTextColor={COLORS.textTertiary}
                  value={dropoff}
                  onFocus={() => setActiveField('dropoff')}
                  onChangeText={(value) => {
                    setDropoff(value);
                    setDropoffLocation(null);
                    setActiveField('dropoff');
                  }}
                />
                <Search size={18} color={COLORS.textTertiary} />
              </View>
              {renderSuggestions('dropoff', dropoffSuggestions)}
            </View>
          </View>
        </View>

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
                <View
                  style={[
                    styles.rideTypeIcon,
                    selectedType === type.id && { backgroundColor: `${type.color}20` },
                  ]}
                >
                  <type.icon
                    size={20}
                    color={selectedType === type.id ? type.color : COLORS.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.rideTypeLabel,
                    selectedType === type.id && styles.rideTypeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
                {type.savings ? (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{type.savings}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.strategyCard}>
          <Text style={styles.strategyTitle}>MVP corridor strategy</Text>
          <Text style={styles.strategyText}>
            Prioritize dense commuter corridors first so match rates and driver earnings stay strong.
          </Text>
        </View>

        <View style={styles.quickPlaces}>
          {USER_PROFILE.savedPlaces.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.quickPlace}
              onPress={() => {
                if (place.label === 'Home') {
                  setPickup(place.address);
                  setPickupLocation(null);
                } else {
                  setDropoff(place.address);
                  setDropoffLocation(null);
                }
              }}
            >
              <View style={styles.quickPlaceIcon}>
                <Star size={14} color={COLORS.primary} />
              </View>
              <View style={styles.quickPlaceInfo}>
                <Text style={styles.quickPlaceLabel}>{place.label}</Text>
                <Text style={styles.quickPlaceAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              </View>
              <ChevronRight size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.findButton}
          onPress={handleSearch}
          disabled={loading || routingLoading}
        >
          {loading || routingLoading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <>
              <Search size={20} color={COLORS.textInverse} />
              <Text style={styles.findButtonText}>Find Smart Matches</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.safetyBadge}>
          <Shield size={14} color={COLORS.success} />
          <Text style={styles.safetyText}>Live quotes, insured rides, and backend-ready trip orchestration</Text>
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  centerMarkerRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.surface}EE`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  locationText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  nearbyBadge: {
    backgroundColor: `${COLORS.primary}E6`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nearbyText: {
    color: COLORS.textInverse,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 140,
  },
  mapControlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  mapControlText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    ...FONTS.bold,
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    minHeight: height * 0.53,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 18,
    ...FONTS.regular,
  },
  inputsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    padding: 14,
  },
  inputDots: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 10,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  dottedLine: {
    width: 2,
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 6,
  },
  inputs: {
    flex: 1,
  },
  inputBlock: {
    minHeight: 50,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  inputDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  suggestionList: {
    gap: 8,
    paddingBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  suggestionMeta: {
    color: COLORS.textSecondary,
    marginTop: 2,
    ...FONTS.regular,
  },
  rideTypesScroll: {
    marginTop: 18,
  },
  rideTypes: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 12,
  },
  rideTypeCard: {
    width: 132,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rideTypeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  rideTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rideTypeLabel: {
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
  },
  rideTypeLabelActive: {
    color: COLORS.textPrimary,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: `${COLORS.success}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  strategyCard: {
    backgroundColor: '#F5F8FF',
    borderRadius: SIZES.radius_lg,
    padding: 14,
    marginTop: 16,
  },
  strategyTitle: {
    color: COLORS.textPrimary,
    marginBottom: 4,
    ...FONTS.semiBold,
  },
  strategyText: {
    color: COLORS.textSecondary,
    lineHeight: 20,
    ...FONTS.regular,
  },
  quickPlaces: {
    marginTop: 16,
    gap: 10,
  },
  quickPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    padding: 12,
  },
  quickPlaceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${COLORS.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickPlaceInfo: {
    flex: 1,
  },
  quickPlaceLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  quickPlaceAddress: {
    color: COLORS.textSecondary,
    marginTop: 2,
    ...FONTS.regular,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 12,
    ...FONTS.medium,
  },
  findButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  findButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  safetyBadge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
});
