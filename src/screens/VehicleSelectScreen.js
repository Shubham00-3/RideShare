import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Car,
  Clock,
  Filter,
  Leaf,
  MapPin,
  Star,
  Users,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useRide } from '../context/RideContext';
import RouteMap from '../components/RouteMap';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'economy', label: 'Economy' },
  { id: 'comfort', label: 'Comfort' },
  { id: 'eco', label: 'ECO' },
];

export default function VehicleSelectScreen({ navigation }) {
  const { chooseVehicle, rideRequest, selectedMatch, selectedVehicle } = useRide();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const vehicles = selectedMatch?.vehicles ?? [];
  const filteredVehicles = useMemo(() => {
    if (selectedFilter === 'all') {
      return vehicles;
    }

    return vehicles.filter((vehicle) => vehicle.category === selectedFilter);
  }, [selectedFilter, vehicles]);

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <RouteMap
          style={styles.mapPlaceholder}
          pickupLocation={rideRequest?.pickupLocation || null}
          dropoffLocation={rideRequest?.dropoffLocation || null}
          routeGeometry={rideRequest?.route?.geometry || null}
          distanceLabel={
            rideRequest?.distanceKm ? `${Math.round(rideRequest.distanceKm)} km` : null
          }
        />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.routeBadge}>
            <MapPin size={14} color={COLORS.primary} />
            <Text style={styles.routeBadgeText}>
              {rideRequest ? `${rideRequest.pickup.split(',')[0]} -> ${rideRequest.dropoff.split(',')[0]}` : 'Route'}
            </Text>
          </View>
          <View style={styles.filterBtn}>
            <Filter size={18} color={COLORS.primary} />
          </View>
        </View>
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sectionTitle}>Choose a driver and vehicle</Text>
        <Text style={styles.sectionSubtitle}>
          Each option is generated from the matched corridor candidate and priced for pooled earnings.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filters}>
            {FILTERS.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.filterChip,
                  selectedFilter === type.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(type.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === type.id && styles.filterChipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.vehicleList}
          contentContainerStyle={styles.vehicleListContent}
        >
          {filteredVehicles.map((vehicle) => {
            const isSelected = selectedVehicle?.providerVehicleId === vehicle.providerVehicleId;

            return (
              <TouchableOpacity
                key={vehicle.providerVehicleId}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                onPress={() => chooseVehicle(vehicle)}
              >
                <View style={styles.vehicleImageContainer}>
                  <View style={styles.vehicleImagePlaceholder}>
                    <Car size={36} color={COLORS.primary} />
                  </View>
                  {vehicle.category === 'eco' ? (
                    <View style={styles.ecoBadge}>
                      <Leaf size={10} color={COLORS.success} />
                      <Text style={styles.ecoText}>EV</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                  <Text style={styles.vehicleType}>{vehicle.type}</Text>

                  <View style={styles.vehicleMetrics}>
                    <View style={styles.metricItem}>
                      <MapPin size={12} color={COLORS.textTertiary} />
                      <Text style={styles.metricText}>{vehicle.distance}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Clock size={12} color={COLORS.textTertiary} />
                      <Text style={styles.metricText}>{vehicle.eta}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Users size={12} color={COLORS.textTertiary} />
                      <Text style={styles.metricText}>{vehicle.seats} seats</Text>
                    </View>
                  </View>

                  <View style={styles.driverRow}>
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverAvatarText}>{vehicle.driver.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.driverName}>{vehicle.driver.name}</Text>
                    <Star size={12} color={COLORS.star} fill={COLORS.star} />
                    <Text style={styles.driverRating}>{vehicle.driver.rating}</Text>
                    <Text style={styles.driverTrips}>({vehicle.driver.trips} trips)</Text>
                  </View>
                </View>

                <View style={styles.fareContainer}>
                  <Text style={styles.fareAmount}>{vehicle.fare}</Text>
                  <Text style={styles.fareRate}>{vehicle.farePerKm}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {selectedVehicle ? (
        <View style={styles.bottomAction}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected</Text>
            <Text style={styles.selectedName}>{selectedVehicle.name}</Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={() => navigation.navigate('Checkout')}>
            <Text style={styles.bookButtonText}>Review quote</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapSection: {
    height: 220,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8ECF0',
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  routeBadgeText: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContent: {
    flex: 1,
    marginTop: -20,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 14,
    ...FONTS.regular,
  },
  filtersScroll: {
    marginBottom: 6,
    flexGrow: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  filterChip: {
    width: 82,
    height: 82,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: `${COLORS.primary}14`,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    ...FONTS.medium,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  vehicleList: {
    flex: 1,
  },
  vehicleListContent: {
    paddingTop: 0,
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_xl,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FBFF',
  },
  vehicleImageContainer: {
    marginRight: 14,
    alignItems: 'center',
  },
  vehicleImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecoBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${COLORS.success}18`,
  },
  ecoText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  vehicleType: {
    color: COLORS.textSecondary,
    marginTop: 4,
    ...FONTS.regular,
  },
  vehicleMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  driverAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${COLORS.primary}16`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  driverName: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  driverRating: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  driverTrips: {
    color: COLORS.textTertiary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  fareContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  fareAmount: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  fareRate: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.large,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  selectedName: {
    color: COLORS.textPrimary,
    marginTop: 4,
    ...FONTS.semiBold,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
  },
  bookButtonText: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
});
