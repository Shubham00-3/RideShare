import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Filter,
  Star,
  MapPin,
  Clock,
  Users,
  Fuel,
  Leaf,
  Car,
} from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MOCK_VEHICLES, VEHICLE_TYPES } from '../constants/data';

const { width } = Dimensions.get('window');

export default function VehicleSelectScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const filteredVehicles =
    selectedFilter === 'all'
      ? MOCK_VEHICLES
      : MOCK_VEHICLES.filter((v) => v.category === selectedFilter);

  return (
    <View style={styles.container}>
      {/* Map Top Section */}
      <View style={styles.mapSection}>
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapRoad} />
          <View style={styles.mapRoad2} />
          {/* Route Line */}
          <View style={styles.routeLine} />
          {/* Driver Icon */}
          <View style={styles.driverIcon}>
            <Car size={16} color={COLORS.primary} />
          </View>
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.routeBadge}>
            <MapPin size={14} color={COLORS.primary} />
            <Text style={styles.routeBadgeText}>CP → Akshardham</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        <View style={styles.sheetHandle} />

        <Text style={styles.sectionTitle}>Choose your ride</Text>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          <View style={styles.filters}>
            {VEHICLE_TYPES.map((type) => (
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

        {/* Vehicle Cards */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.vehicleList}
        >
          {filteredVehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.vehicleCardSelected,
              ]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              {/* Vehicle Image Placeholder */}
              <View style={styles.vehicleImageContainer}>
                <View style={styles.vehicleImagePlaceholder}>
                  <Car size={36} color={COLORS.primary} />
                </View>
                {vehicle.category === 'eco' && (
                  <View style={styles.ecoBadge}>
                    <Leaf size={10} color={COLORS.success} />
                    <Text style={styles.ecoText}>EV</Text>
                  </View>
                )}
              </View>

              {/* Vehicle Info */}
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

                {/* Driver Info */}
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverAvatarText}>
                      {vehicle.driver.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.driverName}>{vehicle.driver.name}</Text>
                  <Star size={12} color={COLORS.star} fill={COLORS.star} />
                  <Text style={styles.driverRating}>{vehicle.driver.rating}</Text>
                  <Text style={styles.driverTrips}>
                    ({vehicle.driver.trips} trips)
                  </Text>
                </View>
              </View>

              {/* Fare */}
              <View style={styles.fareContainer}>
                <Text style={styles.fareAmount}>{vehicle.fare}</Text>
                <Text style={styles.fareRate}>{vehicle.farePerKm}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Bottom Action */}
      {selectedVehicle && (
        <View style={styles.bottomAction}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected</Text>
            <Text style={styles.selectedName}>
              {MOCK_VEHICLES.find((v) => v.id === selectedVehicle)?.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.bookButtonText}>Book Ride</Text>
          </TouchableOpacity>
        </View>
      )}
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
  mapRoad: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FFF',
  },
  mapRoad2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 6,
    backgroundColor: '#FFF',
  },
  routeLine: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  driverIcon: {
    position: 'absolute',
    top: '35%',
    left: '40%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
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
    ...SHADOWS.medium,
  },
  routeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius_full,
    gap: 6,
    ...SHADOWS.medium,
  },
  routeBadgeText: {
    fontSize: SIZES.md,
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
    ...SHADOWS.medium,
  },
  bottomContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 12,
  },
  filtersScroll: {
    marginBottom: 14,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  filterChipTextActive: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  vehicleList: {
    flex: 1,
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  vehicleImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  vehicleImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecoBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
    gap: 2,
  },
  ecoText: {
    fontSize: 9,
    color: COLORS.success,
    ...FONTS.bold,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  vehicleType: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    ...FONTS.regular,
    marginTop: 1,
  },
  vehicleMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricText: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  driverAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 10,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  driverName: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  driverRating: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
  },
  driverTrips: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  fareContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fareAmount: {
    fontSize: SIZES.xxl,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  fareRate: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
    marginTop: 2,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.large,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textTertiary,
    ...FONTS.regular,
  },
  selectedName: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
    ...SHADOWS.medium,
  },
  bookButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
});
