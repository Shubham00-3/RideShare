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
  Clock,
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
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import RouteMap from '../components/RouteMap';
import { fetchRoutePreview, searchPlaces } from '../services/api';

const { height } = Dimensions.get('window');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function withTime(date, hours, minutes) {
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function buildSchedulePresets() {
  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);

  if (tonight.getTime() <= now.getTime()) {
    tonight.setDate(tonight.getDate() + 1);
  }

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  const tomorrowEvening = new Date(now);
  tomorrowEvening.setDate(tomorrowEvening.getDate() + 1);
  tomorrowEvening.setHours(18, 30, 0, 0);

  return [
    { id: 'soon', label: 'In 30 min', value: addMinutes(now, 30) },
    { id: 'tonight', label: 'Tonight 8:00 PM', value: tonight },
    { id: 'tomorrow-morning', label: 'Tomorrow 9:00 AM', value: tomorrowMorning },
    { id: 'tomorrow-evening', label: 'Tomorrow 6:30 PM', value: tomorrowEvening },
  ];
}

function formatDeparture(date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatScheduleDateChip(date, index) {
  if (index === 0) {
    return {
      label: 'Today',
      sublabel: new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(date),
    };
  }

  if (index === 1) {
    return {
      label: 'Tomorrow',
      sublabel: new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(date),
    };
  }

  return {
    label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
    sublabel: new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(date),
  };
}

function buildScheduleDateOptions(selectedDeparture) {
  const anchorDate = startOfDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const value = addDays(anchorDate, index);

    return {
      id: `schedule-date-${index}`,
      value,
      ...formatScheduleDateChip(value, index),
      isSelected: sameDay(value, selectedDeparture),
    };
  });
}

function buildScheduleTimeOptions(selectedDeparture) {
  const slotDefinitions = [
    { id: '07:00', label: '7:00 AM', hours: 7, minutes: 0 },
    { id: '08:30', label: '8:30 AM', hours: 8, minutes: 30 },
    { id: '10:00', label: '10:00 AM', hours: 10, minutes: 0 },
    { id: '12:00', label: '12:00 PM', hours: 12, minutes: 0 },
    { id: '02:00', label: '2:00 PM', hours: 14, minutes: 0 },
    { id: '04:30', label: '4:30 PM', hours: 16, minutes: 30 },
    { id: '06:30', label: '6:30 PM', hours: 18, minutes: 30 },
    { id: '08:00', label: '8:00 PM', hours: 20, minutes: 0 },
    { id: '09:30', label: '9:30 PM', hours: 21, minutes: 30 },
  ];
  const now = new Date();
  const isToday = sameDay(selectedDeparture, now);

  const slots = slotDefinitions
    .map((slot) => ({
      ...slot,
      value: withTime(selectedDeparture, slot.hours, slot.minutes),
    }))
    .filter((slot) => !isToday || slot.value.getTime() > now.getTime() + 5 * 60 * 1000);

  if (slots.length > 0) {
    return slots.map((slot) => ({
      ...slot,
      isSelected:
        slot.hours === selectedDeparture.getHours() &&
        slot.minutes === selectedDeparture.getMinutes(),
    }));
  }

  const fallbackDate = withTime(addDays(selectedDeparture, 1), 8, 0);

  return [
    {
      id: 'next-day-08:00',
      label: 'Next day 8:00 AM',
      hours: 8,
      minutes: 0,
      value: fallbackDate,
      isSelected:
        sameDay(fallbackDate, selectedDeparture) &&
        fallbackDate.getHours() === selectedDeparture.getHours() &&
        fallbackDate.getMinutes() === selectedDeparture.getMinutes(),
    },
  ];
}

function getScheduledDepartureDate(booking) {
  const departureTime = booking?.trip?.departureTime;

  if (!departureTime) {
    return null;
  }

  const date = new Date(departureTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUpcomingScheduledBooking(booking) {
  const departureDate = getScheduledDepartureDate(booking);
  const status = String(booking?.status || booking?.trip?.status || '').toLowerCase();
  const rideType = String(booking?.trip?.rideType || '').toLowerCase();

  if (!departureDate) {
    return false;
  }

  if (rideType !== 'schedule' && status !== 'scheduled') {
    return false;
  }

  if (['completed', 'cancelled'].includes(status)) {
    return false;
  }

  return departureDate.getTime() >= Date.now();
}

function formatBookingStatus(status) {
  const normalized = String(status || 'scheduled').replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const {
    activeBookingId,
    bookingHistory,
    error,
    loading,
    refreshBookingHistory,
    searchForm,
    searchRides,
  } = useRide();
  const [pickup, setPickup] = useState(searchForm.pickup);
  const [dropoff, setDropoff] = useState(searchForm.dropoff);
  const [selectedType, setSelectedType] = useState(searchForm.rideType);
  const [scheduledDeparture, setScheduledDeparture] = useState(
    new Date(searchForm.departureTime)
  );
  const [womenOnly, setWomenOnly] = useState(Boolean(searchForm.womenOnly));
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
    setWomenOnly(Boolean(searchForm.womenOnly));
    setPickupLocation(searchForm.pickupLocation || null);
    setDropoffLocation(searchForm.dropoffLocation || null);
    setScheduledDeparture(new Date(searchForm.departureTime));
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

  useEffect(() => {
    if (selectedType !== 'schedule') {
      return undefined;
    }

    refreshBookingHistory().catch(() => {
      // Shared booking state already exposes any backend error.
    });

    return undefined;
  }, [refreshBookingHistory, selectedType]);

  const rideTypes = [
    { id: 'shared', label: 'Shared Ride', icon: Users, savings: 'Save 40%', color: COLORS.success },
    { id: 'solo', label: 'Solo Ride', icon: Car, savings: null, color: COLORS.primary },
    { id: 'schedule', label: 'Schedule', icon: Calendar, savings: null, color: COLORS.accent },
  ];
  const schedulePresets = buildSchedulePresets();
  const scheduleDateOptions = buildScheduleDateOptions(scheduledDeparture);
  const scheduleTimeOptions = buildScheduleTimeOptions(scheduledDeparture);
  const upcomingScheduledBookings = bookingHistory
    .filter(isUpcomingScheduledBooking)
    .sort((left, right) => {
      const leftTime = getScheduledDepartureDate(left)?.getTime() || Number.MAX_SAFE_INTEGER;
      const rightTime = getScheduledDepartureDate(right)?.getTime() || Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 3);
  const canUseWomenOnly = user?.gender === 'female';

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
        womenOnly: canUseWomenOnly && selectedType !== 'solo' ? womenOnly : false,
        departureTime:
          selectedType === 'schedule'
            ? scheduledDeparture.toISOString()
            : addMinutes(new Date(), 15).toISOString(),
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

      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={styles.bottomSheetContent}
        showsVerticalScrollIndicator={false}
      >
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

        {canUseWomenOnly && selectedType !== 'solo' ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.safetyPreferenceCard, womenOnly && styles.safetyPreferenceCardActive]}
            onPress={() => setWomenOnly((value) => !value)}
          >
            <View style={styles.safetyPreferenceIcon}>
              <Shield size={20} color={womenOnly ? COLORS.textInverse : COLORS.primary} />
            </View>
            <View style={styles.safetyPreferenceCopy}>
              <Text style={[styles.safetyPreferenceTitle, womenOnly && styles.safetyPreferenceTitleActive]}>
                Women-only ride
              </Text>
              <Text style={[styles.safetyPreferenceText, womenOnly && styles.safetyPreferenceTextActive]}>
                Match only with female drivers and female co-passengers.
              </Text>
            </View>
            <View style={[styles.safetyToggle, womenOnly && styles.safetyToggleActive]}>
              <View style={[styles.safetyToggleKnob, womenOnly && styles.safetyToggleKnobActive]} />
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.strategyCard}>
          <Text style={styles.strategyTitle}>MVP corridor strategy</Text>
          <Text style={styles.strategyText}>
            Prioritize dense commuter corridors first so match rates and driver earnings stay strong.
          </Text>
        </View>

        {selectedType === 'schedule' ? (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>Scheduled departure</Text>
            <Text style={styles.scheduleValue}>{formatDeparture(scheduledDeparture)}</Text>
            <Text style={styles.scheduleSubtitle}>
              Save the trip now and we will keep it ready for that departure window.
            </Text>

            <View style={styles.schedulePresets}>
              {schedulePresets.map((preset) => {
                const isSelected =
                  Math.abs(preset.value.getTime() - scheduledDeparture.getTime()) < 60000;

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.schedulePreset,
                      isSelected && styles.schedulePresetActive,
                    ]}
                    onPress={() => setScheduledDeparture(new Date(preset.value))}
                  >
                    <Text
                      style={[
                        styles.schedulePresetText,
                        isSelected && styles.schedulePresetTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.scheduleChooserTitle}>Choose a date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scheduleDateList}
            >
              {scheduleDateOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.scheduleDateChip,
                    option.isSelected && styles.scheduleDateChipActive,
                  ]}
                  onPress={() =>
                    setScheduledDeparture(
                      withTime(option.value, scheduledDeparture.getHours(), scheduledDeparture.getMinutes())
                    )
                  }
                >
                  <Text
                    style={[
                      styles.scheduleDateLabel,
                      option.isSelected && styles.scheduleDateLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleDateSublabel,
                      option.isSelected && styles.scheduleDateSublabelActive,
                    ]}
                  >
                    {option.sublabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.scheduleChooserTitle}>Choose a time</Text>
            <View style={styles.scheduleTimeList}>
              {scheduleTimeOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.scheduleTimeChip,
                    option.isSelected && styles.scheduleTimeChipActive,
                  ]}
                  onPress={() => setScheduledDeparture(new Date(option.value))}
                >
                  <Clock
                    size={14}
                    color={option.isSelected ? COLORS.textInverse : COLORS.accent}
                  />
                  <Text
                    style={[
                      styles.scheduleTimeLabel,
                      option.isSelected && styles.scheduleTimeLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {selectedType === 'schedule' ? (
          <View style={styles.scheduledTripsSection}>
            <View style={styles.scheduledTripsHeader}>
              <View>
                <Text style={styles.scheduledTripsTitle}>Already scheduled</Text>
                <Text style={styles.scheduledTripsSubtitle}>
                  Review the rides you have already lined up before booking another.
                </Text>
              </View>
            </View>

            {loading && bookingHistory.length === 0 ? (
              <View style={styles.scheduledEmptyCard}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.scheduledEmptyText}>Loading your scheduled rides...</Text>
              </View>
            ) : null}

            {!loading && upcomingScheduledBookings.length === 0 ? (
              <View style={styles.scheduledEmptyCard}>
                <Text style={styles.scheduledEmptyTitle}>No scheduled rides yet</Text>
                <Text style={styles.scheduledEmptyText}>
                  Schedule a ride here and it will appear with all trip details.
                </Text>
              </View>
            ) : null}

            {upcomingScheduledBookings.map((booking) => {
              const trip = booking.trip;
              const departureDate = getScheduledDepartureDate(booking);
              const isLiveBooking = activeBookingId === booking.bookingId;

              return (
                <TouchableOpacity
                  key={booking.bookingId}
                  style={styles.scheduledTripCard}
                  onPress={() => navigation.navigate('BookingDetail', { booking })}
                >
                  <View style={styles.scheduledTripTop}>
                    <View style={styles.scheduledStatusBadge}>
                      <Calendar size={12} color={COLORS.accent} />
                      <Text style={styles.scheduledStatusText}>
                        {formatBookingStatus(trip?.status || booking.status)}
                      </Text>
                    </View>
                    <Text style={styles.scheduledFare}>Rs {trip?.fareTotal || 0}</Text>
                  </View>

                  <Text style={styles.scheduledRouteTitle}>{trip?.routeLabel}</Text>

                  <View style={styles.scheduledRouteRow}>
                    <MapPin size={14} color={COLORS.success} />
                    <Text numberOfLines={1} style={styles.scheduledRouteText}>
                      {trip?.pickup}
                    </Text>
                  </View>
                  <View style={styles.scheduledRouteRow}>
                    <MapPin size={14} color={COLORS.error} />
                    <Text numberOfLines={1} style={styles.scheduledRouteText}>
                      {trip?.dropoff}
                    </Text>
                  </View>

                  <View style={styles.scheduledMetaRow}>
                    <View style={styles.scheduledMetaChip}>
                      <Clock size={13} color={COLORS.primary} />
                      <Text style={styles.scheduledMetaText}>
                        {departureDate ? formatDeparture(departureDate) : 'Departure pending'}
                      </Text>
                    </View>
                    <View style={styles.scheduledMetaChip}>
                      <Car size={13} color={COLORS.primary} />
                      <Text style={styles.scheduledMetaText}>
                        {trip?.vehicle?.name || 'Vehicle assigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scheduledBottomRow}>
                    <View style={styles.scheduledDriverInfo}>
                      <View style={styles.scheduledDriverAvatar}>
                        <Text style={styles.scheduledDriverAvatarText}>
                          {trip?.driver?.name?.charAt(0) || 'D'}
                        </Text>
                      </View>
                      <View style={styles.scheduledDriverCopy}>
                        <Text style={styles.scheduledDriverName}>
                          {trip?.driver?.name || 'Driver assigned'}
                        </Text>
                        <Text style={styles.scheduledDriverMeta}>
                          {trip?.distanceKm || 0} km | {trip?.durationMinutes || 0} min
                        </Text>
                      </View>
                    </View>
                    <View style={styles.scheduledActionChip}>
                      <Text style={styles.scheduledActionText}>
                        {isLiveBooking ? 'Open live trip' : 'View details'}
                      </Text>
                      <ChevronRight size={16} color={COLORS.textTertiary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

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
      </ScrollView>
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
    minHeight: height * 0.53,
    ...SHADOWS.large,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
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
  scheduleCard: {
    backgroundColor: '#FFF8EF',
    borderRadius: SIZES.radius_lg,
    padding: 14,
    marginTop: 16,
  },
  scheduleTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  scheduleValue: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xl,
    marginTop: 6,
    ...FONTS.bold,
  },
  scheduleSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 20,
    ...FONTS.regular,
  },
  schedulePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  scheduleChooserTitle: {
    color: COLORS.textPrimary,
    marginTop: 16,
    ...FONTS.semiBold,
  },
  scheduleDateList: {
    gap: 10,
    paddingRight: 4,
    marginTop: 12,
  },
  scheduleDateChip: {
    minWidth: 86,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scheduleDateChipActive: {
    backgroundColor: COLORS.accent,
  },
  scheduleDateLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  scheduleDateLabelActive: {
    color: COLORS.textInverse,
  },
  scheduleDateSublabel: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  scheduleDateSublabelActive: {
    color: 'rgba(255,255,255,0.84)',
  },
  schedulePreset: {
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  schedulePresetActive: {
    backgroundColor: COLORS.accent,
  },
  schedulePresetText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  schedulePresetTextActive: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  scheduleTimeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  scheduleTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleTimeChipActive: {
    backgroundColor: COLORS.accent,
  },
  scheduleTimeLabel: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  scheduleTimeLabelActive: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  scheduledTripsSection: {
    marginTop: 16,
    gap: 10,
  },
  safetyPreferenceCard: {
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: SIZES.radius_xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.small,
  },
  safetyPreferenceCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  safetyPreferenceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyPreferenceCopy: {
    flex: 1,
  },
  safetyPreferenceTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  safetyPreferenceTitleActive: {
    color: COLORS.textInverse,
  },
  safetyPreferenceText: {
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 19,
    ...FONTS.regular,
  },
  safetyPreferenceTextActive: {
    color: 'rgba(255,255,255,0.82)',
  },
  safetyToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 3,
    justifyContent: 'center',
  },
  safetyToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  safetyToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },
  safetyToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  scheduledTripsHeader: {
    marginBottom: 2,
  },
  scheduledTripsTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  scheduledTripsSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 20,
    ...FONTS.regular,
  },
  scheduledEmptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    padding: 16,
    alignItems: 'center',
  },
  scheduledEmptyTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  scheduledEmptyText: {
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    ...FONTS.regular,
  },
  scheduledTripCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    padding: 14,
    ...SHADOWS.small,
  },
  scheduledTripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduledStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radius_full,
    backgroundColor: `${COLORS.accent}14`,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduledStatusText: {
    color: COLORS.accent,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  scheduledFare: {
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  scheduledRouteTitle: {
    color: COLORS.textPrimary,
    marginTop: 12,
    ...FONTS.semiBold,
  },
  scheduledRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  scheduledRouteText: {
    flex: 1,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  scheduledMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  scheduledMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduledMetaText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  scheduledBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  scheduledDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  scheduledDriverAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduledDriverAvatarText: {
    color: COLORS.primary,
    ...FONTS.bold,
  },
  scheduledDriverCopy: {
    flex: 1,
  },
  scheduledDriverName: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  scheduledDriverMeta: {
    color: COLORS.textTertiary,
    marginTop: 2,
    fontSize: SIZES.xs,
    ...FONTS.regular,
  },
  scheduledActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scheduledActionText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
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
