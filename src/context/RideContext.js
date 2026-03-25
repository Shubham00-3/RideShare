import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  confirmRideBooking,
  fetchBookingDetails,
  fetchBookingQuote,
  fetchMyBookings,
  hasApiBaseUrl,
  previewRideMatches,
} from '../services/api';

const RideContext = createContext(null);

const DEFAULT_SEARCH = {
  pickup: 'Connaught Place, New Delhi',
  dropoff: 'Akshardham Temple, Delhi',
  pickupLocation: null,
  dropoffLocation: null,
  route: null,
  rideType: 'shared',
  seatsRequired: 1,
  allowMidTripPickup: true,
  departureTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};

export function RideProvider({ children }) {
  const { signOut, token } = useAuth();
  const [searchForm, setSearchForm] = useState(DEFAULT_SEARCH);
  const [rideRequest, setRideRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [quote, setQuote] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [activeBookingSource, setActiveBookingSource] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      return;
    }

    setSearchForm(DEFAULT_SEARCH);
    setRideRequest(null);
    setMatches([]);
    setSelectedMatch(null);
    setSelectedVehicle(null);
    setQuote(null);
    setActiveTrip(null);
    setActiveBookingId(null);
    setActiveBookingSource(null);
    setBookingHistory([]);
    setError(null);
    setLoading(false);
  }, [token]);

  const searchRides = useCallback(async (input) => {
    const nextSearch = {
      ...DEFAULT_SEARCH,
      ...input,
    };

    setLoading(true);
    setError(null);

    try {
      const response = await previewRideMatches(nextSearch, token);

      setSearchForm(response.request || nextSearch);
      setRideRequest(response.request);
      setMatches(response.matches);
      setSelectedMatch(response.matches[0] ?? null);
      setSelectedVehicle(null);
      setQuote(null);
      setActiveTrip(null);
      setActiveBookingId(null);
      setActiveBookingSource(null);

      return response;
    } catch (searchError) {
      const message = searchError.message || 'Unable to search rides right now.';
      setError(message);
      throw searchError;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const chooseMatch = useCallback((match) => {
    setSelectedMatch(match);
    setSelectedVehicle(null);
    setQuote(null);
  }, []);

  const chooseVehicle = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
    setQuote(null);
  }, []);

  const refreshQuote = useCallback(async (options = {}) => {
    if (!rideRequest || !selectedMatch || !selectedVehicle) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextQuote = await fetchBookingQuote({
        request: rideRequest,
        match: selectedMatch,
        vehicle: selectedVehicle,
        options: {
          insurance: true,
          allowMidTripPickup: true,
          ...options,
        },
      }, token);
      setQuote(nextQuote);
      return nextQuote;
    } catch (quoteError) {
      const message = quoteError.message || 'Unable to calculate fare right now.';
      setError(message);
      throw quoteError;
    } finally {
      setLoading(false);
    }
  }, [rideRequest, selectedMatch, selectedVehicle, token]);

  const createBooking = useCallback(async (options = {}) => {
    if (!rideRequest || !selectedMatch || !selectedVehicle) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextQuote = quote ?? (await refreshQuote(options));
      const booking = await confirmRideBooking({
        request: rideRequest,
        match: selectedMatch,
        vehicle: selectedVehicle,
        quote: nextQuote,
        options,
      }, token);
      setQuote(nextQuote);
      setActiveTrip(booking.trip);
      setActiveBookingId(booking.bookingId);
      setActiveBookingSource(booking.source || 'api');
      return booking;
    } catch (bookingError) {
      const message = bookingError.message || 'Unable to confirm ride right now.';
      setError(message);
      throw bookingError;
    } finally {
      setLoading(false);
    }
  }, [quote, refreshQuote, rideRequest, selectedMatch, selectedVehicle, token]);

  const refreshActiveBooking = useCallback(async (bookingIdOverride) => {
    const bookingId = bookingIdOverride || activeBookingId;

    if (!bookingId || !hasApiBaseUrl) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const booking = await fetchBookingDetails(bookingId, token);
      setActiveBookingId(booking.bookingId);
      setActiveBookingSource(booking.source || 'api');
      setActiveTrip(booking.trip);
      return booking;
    } catch (bookingError) {
      if (bookingError.statusCode === 401) {
        await signOut();
      }

      const message = bookingError.message || 'Unable to refresh trip right now.';
      setError(message);
      throw bookingError;
    } finally {
      setLoading(false);
    }
  }, [activeBookingId, signOut, token]);

  const refreshBookingHistory = useCallback(async () => {
    if (!token || !hasApiBaseUrl) {
      setBookingHistory([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchMyBookings(token);
      const items = response.items || [];
      setBookingHistory(items);
      return items;
    } catch (historyError) {
      if (historyError.statusCode === 401) {
        await signOut();
      }

      const message = historyError.message || 'Unable to load trip history right now.';
      setError(message);
      throw historyError;
    } finally {
      setLoading(false);
    }
  }, [signOut, token]);

  const value = useMemo(
    () => ({
      activeBookingId,
      activeBookingSource,
      activeTrip,
      bookingHistory,
      chooseMatch,
      chooseVehicle,
      createBooking,
      error,
      loading,
      matches,
      quote,
      refreshActiveBooking,
      refreshBookingHistory,
      refreshQuote,
      rideRequest,
      searchForm,
      searchRides,
      selectedMatch,
      selectedVehicle,
      setError,
      setSearchForm,
    }),
    [
      activeTrip,
      activeBookingId,
      activeBookingSource,
      bookingHistory,
      error,
      loading,
      matches,
      quote,
      refreshActiveBooking,
      refreshBookingHistory,
      rideRequest,
      searchForm,
      selectedMatch,
      selectedVehicle,
      searchRides,
      refreshQuote,
      createBooking,
      chooseMatch,
      chooseVehicle,
    ]
  );

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide() {
  const context = useContext(RideContext);

  if (!context) {
    throw new Error('useRide must be used inside RideProvider');
  }

  return context;
}
