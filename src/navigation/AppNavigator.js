import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Home, Clock, User, Car, ChevronRight, Navigation, ShieldCheck } from 'lucide-react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RideMatchScreen from '../screens/RideMatchScreen';
import VehicleSelectScreen from '../screens/VehicleSelectScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import ActiveTripScreen from '../screens/ActiveTripScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SOSScreen from '../screens/SOSScreen';
import SupportScreen from '../screens/SupportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ActiveRideTabBar(props) {
  const { activeTrip } = useRide();
  const hasActiveRide = Boolean(
    activeTrip && !['completed', 'cancelled'].includes(String(activeTrip.status || ''))
  );
  const isScheduledRide = String(activeTrip?.status || '') === 'scheduled';
  const etaLabel =
    typeof activeTrip?.etaMinutes === 'number'
      ? isScheduledRide
        ? `Starts in ${activeTrip.etaMinutes} min`
        : `${activeTrip.etaMinutes} min away`
      : isScheduledRide
        ? 'Scheduled ride'
        : 'Live trip';
  const routeLabel = activeTrip?.dropoff
    ? `Ride to ${activeTrip.dropoff.split(',')[0]}`
    : activeTrip?.pickup
      ? `Ride from ${activeTrip.pickup.split(',')[0]}`
      : 'Track your active ride';

  return (
    <View style={styles.tabBarShell}>
      {hasActiveRide ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.activeRideBanner}
          onPress={() => props.navigation.getParent()?.navigate('ActiveTrip')}
        >
          <View style={styles.activeRideIcon}>
            <Navigation size={16} color={COLORS.textInverse} />
          </View>
          <View style={styles.activeRideContent}>
            <Text style={styles.activeRideTitle}>
              {isScheduledRide ? 'Scheduled ride ready' : 'Active ride in progress'}
            </Text>
            <Text numberOfLines={1} style={styles.activeRideSubtitle}>
              {routeLabel} | {etaLabel}
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.textInverse} />
        </TouchableOpacity>
      ) : null}
      <BottomTabBar {...props} />
    </View>
  );
}

function MainTabs() {
  const { activeTrip } = useRide();
  const { user } = useAuth();
  const hasActiveRide = Boolean(
    activeTrip && !['completed', 'cancelled'].includes(String(activeTrip.status || ''))
  );
  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  return (
    <Tab.Navigator
      tabBar={(props) => <ActiveRideTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: hasActiveRide ? 92 : 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={TripHistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      {isDriver ? (
        <Tab.Screen
          name="Drive"
          component={DriverDashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
          }}
        />
      ) : null}
      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminDashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { hydrated, isAuthenticated } = useAuth();

  if (!hydrated) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Restoring your session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="RideMatch" component={RideMatchScreen} />
            <Stack.Screen name="VehicleSelect" component={VehicleSelectScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
            <Stack.Screen name="SOS" component={SOSScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
  },
  tabBarShell: {
    backgroundColor: COLORS.surface,
  },
  activeRideBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: SIZES.radius_xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeRideIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRideContent: {
    flex: 1,
  },
  activeRideTitle: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  activeRideSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 3,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
});
